import { _decorator, Component, Node, Vec3, Prefab, instantiate, tween } from 'cc';
import { GameConfig } from './GameConfig';
import { Fish, FishState } from './Fish';
import { Skin } from './Skin';
import { Animator } from './Animator';
import { AnimationClip } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 鱼道：一列鱼沿 pathStart→pathEnd 方向游动。
 * 木桩建成后设 barrier，队首鱼停在 barrier 前，后续鱼依次排队。
 * 鱼被砍死后队伍前移，最后一条离出生点足够远时补新鱼。
 */
@ccclass('FishLane')
export class FishLane extends Component {
    @property({ type: Node, tooltip: '出生点（拖空节点）' })
    spawnPoint: Node = null!;
    @property({ type: Node, tooltip: '游动目标点（拖空节点）' })
    endPoint: Node = null!;
    @property({ type: Node, tooltip: '拦截点：木桩建成后鱼停在这里（拖空节点）' })
    blockPoint: Node = null!;
    @property({ type: Prefab, tooltip: '鱼皮1（河豚）' })
    fishPrefabA: Prefab = null!;
    @property({ type: Prefab, tooltip: '鱼皮2（灯笼鱼，可空）' })
    fishPrefabB: Prefab = null!;
    @property({ type: Prefab, tooltip: '鱼皮3（鲨鱼，可空）' })
    fishPrefabC: Prefab = null!;
    @property({ type: AnimationClip, tooltip: '鱼-游动动画' }) clipSwim: AnimationClip = null!;
    @property({ type: AnimationClip, tooltip: '鱼-膨胀/受击动画' }) clipInflate: AnimationClip = null!;
    @property({ type: AnimationClip, tooltip: '鱼-眩晕动画' }) clipStun: AnimationClip = null!;
    @property({ type: AnimationClip, tooltip: '鱼-死亡动画' }) clipDie: AnimationClip = null!;
    @property({ type: Prefab, tooltip: '晕版鱼皮（X 眼那版）：撞桩瞬间从正常版切过去，留空不切换' })
    stunSkinPrefab: Prefab = null!;
    @property({ tooltip: '主角挥砍取肉点（鱼模型局部坐标：x=身宽 y=高 z=身长且+z=头端）。飞刀落点/伤痕/血雾/出肉都对齐这里' })
    chopPointLocal = new Vec3(0.08, 0.45, 0.05);
    @property({ tooltip: '机器砍取肉点（鱼模型局部坐标，轴向同上）。三道伤痕簇/血雾/出肉对齐这里' })
    cutterPointLocal = new Vec3(0.08, 0.45, -0.15);
    @property({ type: Node, tooltip: '木桩节点（拦截点自动贴合它，留空则用 blockPoint）' })
    barrierNode: Node = null!;
    @property({ tooltip: '队首鱼停在木桩前多远(世界单位)：约等于半个鱼身,让鱼头正好顶住桩' })
    stopOffset = 3.9;
    @property({ tooltip: '鱼模型俯仰修正(度)：新骨骼鱼是竖着的,需要放平' }) fishPitch = 0;
    @property({ tooltip: '鱼皮1 缩放（模型原生大小不一时在这调）' }) fishScaleA = 2.0;
    @property({ tooltip: '鱼皮2 缩放' }) fishScaleB = 2.4;
    @property({ tooltip: '鱼皮3 缩放' }) fishScaleC = 1.0;
    /** 运行时收集的非空皮列表 */
    private fishPrefabs: Prefab[] = [];
    @property({ tooltip: '同屏最大鱼数' })
    maxFish = 5;
    @property({ tooltip: '队内间距(px)' })
    queueGapPx = 150;
    @property({ tooltip: '鱼模型朝向修正角(度)：模型出轴不对时调 ±90/180' })
    modelYawOffset = 0;
    @property({ tooltip: '补鱼间距(px)：上一条离出生点超过该值才生成下一条，0=用全局默认680' })
    respawnDistPx = 0;
    @property({ tooltip: '鱼皮贴图名（resources/texture/skin/ 下）' })
    skinTex = 'T_yu_BC';

    /** 木桩是否已建成（Game 在木桩完成时设 true） */
    blocked = false;

    private _fishes: Node[] = [];
    private _skinCursor = 0;

    get fishes() { return this._fishes; }
    /** 队首活鱼（被拦停的那条，砍鱼目标）。已放行游走的鱼不算 */
    get frontFish(): Fish | null {
        for (const n of this._fishes) {
            const f = n.getComponent(Fish);
            if (f && f.alive && f.state !== FishState.Swim) return f;
        }
        return null;
    }

    init(count = 3) {
        this.fishPrefabs = [this.fishPrefabA, this.fishPrefabB, this.fishPrefabC].filter(Boolean);
        for (let i = 0; i < count; i++) this.spawnFish(i * GameConfig.px(this.queueGapPx));
    }

    /** 节点自身或其子节点的世界中心（容器节点取子节点平均） */
    static centerOf(n: Node): Vec3 {
        if (!n.children.length) return n.worldPosition.clone();
        const c = new Vec3();
        n.children.forEach(ch => c.add(ch.worldPosition));
        c.multiplyScalar(1 / n.children.length);
        return c;
    }

    private dir(): Vec3 {
        const d = new Vec3();
        Vec3.subtract(d, this.endPoint.worldPosition, this.spawnPoint.worldPosition);
        d.normalize();
        return d;
    }

    spawnFish(backOffset = 0) {
        if (!this.fishPrefabs.length) return;
        const skinIdx = this._skinCursor % this.fishPrefabs.length;
        const prefab = this.fishPrefabs[skinIdx];
        const skinScale = [this.fishScaleA, this.fishScaleB, this.fishScaleC][skinIdx] || 1;
        this._skinCursor++;
        // 有骨骼动画：建空节点挂 Animator 自动生成模型；否则退回静态 prefab
        let n: Node;
        if (this.clipSwim) {
            // 注意顺序：必须先配置再入场景树。addComponent 时若节点已 active，
            // Animator.start() 会立刻用默认值 build 一次，之后设的 scale/pitch 全部失效。
            n = new Node('Fish');
            const an = n.addComponent(Animator);
            an.autoBuild = false;
            an.skinPrefab = prefab;
            an.clipIdle = this.clipSwim;
            an.clipRun = this.clipSwim;
            an.clipAction = this.clipInflate;
            an.clipDie = this.clipDie;
            an.clipStun = this.clipStun;
            an.modelScale = skinScale;
            an.modelPitch = this.fishPitch;
            // 骨骼版模型必须配骨骼版贴图（_sk 后缀）；同名静态版 UV 不配套，套上是花的
            an.skinTex = this.skinTex + '_sk';
            n.setParent(this.node);
            an.build();
        } else {
            n = instantiate(prefab);
            n.setParent(this.node);
            n.setScale(skinScale, skinScale, skinScale);
            if (n.children[0]) {
                const ch = n.children[0];
                ch.setPosition(0, ch.position.y, 0);
            }
        }
        const d = this.dir();
        const p = this.spawnPoint.worldPosition.clone();
        p.subtract(new Vec3(d.x * backOffset, 0, d.z * backOffset));
        n.setWorldPosition(p);
        // 面向游动方向（可加模型出轴修正角）
        const yaw = Math.atan2(d.x, d.z) * 180 / Math.PI + this.modelYawOffset;
        n.setRotationFromEuler(0, yaw, 0);
        // 预制体可直接用 FBX 模型 prefab：行为组件缺了就运行时补挂
        let f = n.getComponent(Fish);
        if (!f) {
            f = n.addComponent(Fish);
            f.modelNode = n.children[0] ?? n;
            f.skinId = (this._skinCursor - 1) % Math.max(1, this.fishPrefabs.length) + 1;
        }
        f.stunClip = this.clipStun;
        f.stunSkin = this.stunSkinPrefab;
        f.chopPoint.set(this.chopPointLocal);
        f.cutterPoint.set(this.cutterPointLocal);
        f.skinTex = this.clipSwim ? this.skinTex + '_sk' : this.skinTex;
        if (!this.clipSwim) Skin.apply(n, this.skinTex);
        f.reinit();
        this._fishes.push(n);
    }

    private _swimTime = 0;

    update(dt: number) {
        this._swimTime += dt;
        const d = this.dir();
        const speed = GameConfig.fishSpeed;
        const baseYaw = Math.atan2(d.x, d.z) * 180 / Math.PI + this.modelYawOffset;
        let stopDist = 0; // 队首之前允许推进到的位置（沿路径的世界距离）
        let blockW = this.blockPoint ? this.blockPoint.worldPosition.clone() : this.endPoint.worldPosition.clone();
        if (this.barrierNode) {
            // 木桩可能是个容器节点（自身在原点），取子节点实际中心才是真正的桩位
            const bp = FishLane.centerOf(this.barrierNode);
            blockW = new Vec3(bp.x - d.x * this.stopOffset, bp.y, bp.z - d.z * this.stopOffset);
        }

        // 队位按「沿路径的空间先后」排，而不是数组顺序，否则会互相抢位、看起来卡住。
        // proj 是「沿游动方向已推进的距离」，越大越靠前，降序排。
        // 已放行的鱼（越过拦截点游走中）必须排除：它们占住队首名次的话，
        // 真正拦停的鱼被当成第 2 名——目标位多退一个身位（表现为先后退一段），
        // 且永远轮不到 queueIndex===0，撞桩演出不触发。
        const projOf = (n: Node) => (n.worldPosition.x - blockW.x) * d.x + (n.worldPosition.z - blockW.z) * d.z;
        const order = this._fishes
            .map((n, idx) => ({ n, idx, proj: projOf(n) }))
            .filter(o => o.n.getComponent(Fish)!.alive && o.proj <= 0.3)
            .sort((a, b) => b.proj - a.proj);
        const rank = new Map<number, number>();
        order.forEach((o, k) => rank.set(o.idx, k));

        let queueIndex = 0;
        for (let i = 0; i < this._fishes.length; i++) {
            const n = this._fishes[i];
            const f = n.getComponent(Fish)!;
            if (!f.alive) continue;
            queueIndex = rank.get(i) ?? 0;
            const pos = n.worldPosition.clone();
            let move = speed * dt;
            // 已越过拦截点的鱼不回头：直接放行游到终点回收（参考行为）
            const passed = (pos.x - blockW.x) * d.x + (pos.z - blockW.z) * d.z > 0.3;
            if (this.blocked && !passed) {
                // 拦截点前排队：队首停在拦截点，后续每条退 queueGap
                const gap = GameConfig.px(this.queueGapPx);
                const target = blockW.clone().subtract(new Vec3(d.x * gap * queueIndex, 0, d.z * gap * queueIndex));
                const toTarget = new Vec3();
                Vec3.subtract(toTarget, target, pos);
                toTarget.y = 0;
                // 只前进不后退（竞品行为：鱼被拦只会停，绝不倒着游）。
                // ahead<=0 说明鱼已越过自己的队位，就地停住即可
                const ahead = toTarget.x * d.x + toTarget.z * d.z;
                if (ahead <= 0.01 || toTarget.length() <= move) {
                    if (ahead > 0) n.setWorldPosition(target);
                    if (f.state === FishState.Swim) f.state = FishState.Blocked;
                    // 顶在木桩上的队首演「撞桩→膨胀→眩晕」；防重入在 Fish 内部，
                    // 前任被砍死后补位上来的新队首也会演
                    if (queueIndex === 0 && f.playHitBarrier()) this.shakeBarrier();
                } else {
                    toTarget.normalize();
                    pos.add(new Vec3(toTarget.x * move, 0, toTarget.z * move));
                    n.setWorldPosition(pos);
                }
            } else {
                pos.add(new Vec3(d.x * move, 0, d.z * move));
                n.setWorldPosition(pos);
                // 无骨骼动画时才用程序化摆尾顶（有 clip 就交给 clip，避免打架）
                if (!this.clipSwim) {
                    const phase = i * 1.7;
                    n.setRotationFromEuler(0, baseYaw + Math.sin(this._swimTime * 3.2 + phase) * 5, 0);
                    const wob = n.position;
                    n.setPosition(wob.x, Math.sin(this._swimTime * 2.1 + phase) * 0.08, wob.z);
                }
                // 过终点回收（沿路径方向投影超出终点 1u），补鱼逻辑会在上游重生成
                const toEnd = new Vec3();
                Vec3.subtract(toEnd, pos, this.endPoint.worldPosition);
                if (toEnd.x * d.x + toEnd.z * d.z > 1) {
                    this._fishes.splice(i, 1);
                    i--;
                    n.destroy();
                    continue;
                }
            }
        }

        // 补鱼：最新一条沿游动方向越过出生点足够远才补。
        // 不能用 distance——初始鱼排在出生点「后方」，距离照样很大，
        // 开局第一帧就会误判「游远了」而补一条叠在第一条身上（实测出过「一条半鱼」）
        const alive = this._fishes.filter(x => x.getComponent(Fish)!.alive);
        if (alive.length < this.maxFish) {
            const last = alive[alive.length - 1];
            const respawn = GameConfig.px(this.respawnDistPx > 0 ? this.respawnDistPx : GameConfig.FISH_RESPAWN_DIST_PX);
            const sp = this.spawnPoint.worldPosition;
            const lastProj = last ? (last.worldPosition.x - sp.x) * d.x + (last.worldPosition.z - sp.z) * d.z : Infinity;
            if (!last || lastProj > respawn) this.spawnFish();
        }
    }

    /** 移除死鱼（演出结束后调用） */
    removeFish(n: Node) {
        const i = this._fishes.indexOf(n);
        if (i >= 0) this._fishes.splice(i, 1);
        n.destroy();
    }

    /** 鱼撞上木桩瞬间：木桩晃两下（撞击反馈，配合鱼膨胀+眩晕+音效） */
    private shakeBarrier() {
        const b = this.barrierNode;
        if (!b || !b.activeInHierarchy) return;
        const segs = b.children.length ? b.children : [b];
        segs.forEach(s => {
            const base = s.scale.clone();
            tween(s)
                .to(0.06, { scale: new Vec3(base.x * 1.08, base.y * 0.92, base.z * 1.08) })
                .to(0.09, { scale: new Vec3(base.x * 0.96, base.y * 1.05, base.z * 0.96) })
                .to(0.08, { scale: base })
                .start();
        });
    }
}
