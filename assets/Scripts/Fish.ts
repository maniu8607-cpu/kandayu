import { _decorator, Component, Node, Vec3, tween, Tween, MeshRenderer, Color, Material, director, Camera } from 'cc';
import { GameConfig } from './GameConfig';
import { Skin } from './Skin';
import { AudioMgr } from './AudioMgr';
import { Animator } from './Animator';
import { AnimationClip } from 'cc';
const { ccclass, property } = _decorator;

export enum FishState { Swim = 0, Blocked = 1, Struggle = 2, Stun = 3, Dead = 4 }

/**
 * 大鱼：沿车道方向游动 → 被木桩拦住 → 被砍（受击表现）→ 眩晕 → 死亡。
 * 路径与拦截由 FishLane 统一驱动，本组件只管自身状态/表现/血量。
 */
@ccclass('Fish')
export class Fish extends Component {
    @property({ tooltip: '鱼皮编号 1河豚 2灯笼鱼 3鲨鱼（河豚受击膨胀，其余不膨胀）' })
    skinId = 1;
    @property({ type: Node, tooltip: '模型节点（受击缩放/变色作用于它）' })
    modelNode: Node = null!;
    @property({ type: Node, tooltip: '血条节点（可空，缺省不显示）' })
    bloodBar: Node = null!;

    hp = GameConfig.FISH_HP;
    state = FishState.Swim;
    @property({ tooltip: '血条悬浮高度(世界)：要高过鱼背，否则埋进模型里看不见' }) bloodBarHeight = 3.6;
    /** 血条填充宽度(世界)，bg 比它宽一圈 */
    private static readonly BAR_W = 4.2;
    private static _camNode: Node | null = null;
    /** 每刀累计的膨胀比例（河豚专用） */
    private _baseScale = new Vec3(1, 1, 1);
    private _renderers: MeshRenderer[] = [];
    private _normalMat: Material | null = null;
    private _redMat: Material | null = null;
    private _barRoot: Node | null = null;
    private _barFill: Node | null = null;
    private _animator: Animator | null = null;
    /** 眩晕 clip（由 FishLane 注入,需要时热切进 Animator） */
    stunClip: AnimationClip = null!;
    /** 晕版模型（X 眼那版，撞桩瞬间换上；游动期是睁眼正常版）。FishLane 注入 */
    stunSkin: any = null;
    /** 主角挥砍取肉点（模型局部：x=身宽 y=高 z=身长+z头端）。FishLane 注入，决定飞刀落点/伤痕/血雾/出肉 */
    chopPoint = new Vec3(0.08, 0.45, 0.05);
    /** 机器砍取肉点（模型局部）。FishLane 注入，决定三道伤痕簇/血雾/出肉 */
    cutterPoint = new Vec3(0.08, 0.45, -0.15);

    private _baseCaptured = false;

    /** 皮肤贴图名。骨骼鱼由 FishLane 注入带 _sk 后缀的骨骼版（静态版 UV 不配套） */
    skinTex = 'T_yu_BC_sk';
    private _matsRequested = false;

    onLoad() {
        this._animator = this.getComponent(Animator);
        if (this.modelNode) { this._baseScale = this.modelNode.scale.clone(); this._baseCaptured = true; }
        this._renderers = this.getComponentsInChildren(MeshRenderer)
            .filter(r => !r.node.name.startsWith('quad_')); // 伤口等面片不参与受击变红
    }

    /** 惰性取材质：skinTex 是 onLoad 之后才注入的，不能在 onLoad 里取 */
    private ensureMats() {
        if (this._matsRequested) return;
        this._matsRequested = true;
        Skin.getMat(this.skinTex, m => { this._normalMat = m; });
        Skin.getTintMat(this.skinTex, 'red', new Color(255, 70, 70, 255), m => { this._redMat = m; });
    }

    // —— 游动泡圈（竞品鱼嘴前的白圈串）——
    @property({ tooltip: '游动气泡拖尾间隔(s)，0=关' }) bubbleInterval = 0.28;
    @property({ tooltip: '气泡在鱼嘴前方的距离(世界单位)' }) bubbleAhead = 2.4;
    private _bubbleTimer = 0;
    private _bubbles: Node[] = [];
    private _bubbleIdx = 0;

    update(dt: number) {
        if (this.bubbleInterval > 0 && this.state === FishState.Swim) {
            this._bubbleTimer += dt;
            if (this._bubbleTimer >= this.bubbleInterval) { this._bubbleTimer = 0; this.spawnBubble(); }
        }
        // 血条跟随（血条挂在鱼道层,不随鱼旋转）+ billboard 朝相机
        // 贴地朝上的血条从斜俯视角看被压成几像素、还被鱼背挡住——必须正对屏幕
        if (this._barRoot && this._barRoot.isValid) {
            const p = this.node.worldPosition;
            this._barRoot.setWorldPosition(p.x, p.y + this.bloodBarHeight, p.z);
            if (!Fish._camNode || !Fish._camNode.isValid) {
                director.getScene()?.walk(n => {
                    const c = n.getComponent(Camera);
                    if (c && c.enabledInHierarchy && n.name.indexOf('UI') < 0 && !Fish._camNode) Fish._camNode = n;
                });
            }
            if (Fish._camNode) this._barRoot.setWorldRotation(Fish._camNode.worldRotation);
        }
    }

    /** 泡圈铺在鱼嘴前方水面，涨大再缩没。节点池循环复用（不逐泡新建材质） */
    private spawnBubble() {
        const parent = this.node.parent;
        if (!parent) return;
        let b: Node;
        if (this._bubbles.length < 6) {
            b = new Node('bubbleHost');
            b.setParent(parent);
            const q = Skin.groundQuad(b, 1, 1, 'fish_bubble', new Color(255, 255, 255), 170);
            q.setPosition(0, 0, 0);
            this._bubbles.push(b);
        } else {
            b = this._bubbles[this._bubbleIdx % this._bubbles.length];
        }
        this._bubbleIdx++;
        Tween.stopAllByTarget(b);
        const f = this.node.forward;
        const p = this.node.worldPosition;
        b.setWorldPosition(
            p.x + f.x * this.bubbleAhead + (Math.random() - 0.5) * 0.6,
            p.y + 0.12,
            p.z + f.z * this.bubbleAhead + (Math.random() - 0.5) * 0.6);
        b.active = true;
        b.setScale(0.3, 0.3, 0.3);
        tween(b)
            .to(0.5, { scale: new Vec3(0.9, 0.9, 0.9) })
            .to(0.35, { scale: new Vec3(0.04, 0.04, 0.04) })
            .call(() => { b.active = false; })
            .start();
    }

    onDestroy() {
        this._bubbles.forEach(b => { if (b.isValid) { Tween.stopAllByTarget(b); b.destroy(); } });
        if (this._barRoot && this._barRoot.isValid) this._barRoot.destroy();
        if (this._bloodPool && this._bloodPool.isValid) {
            // 血泊残留 2s 再消,别跟着尸体瞬间蒸发
            const bp = this._bloodPool;
            setTimeout(() => { if (bp.isValid) bp.destroy(); }, 2000);
        }
    }

    get alive() { return this.state !== FishState.Dead; }

    /** 撞上木桩：膨胀一次 → 转眩晕循环（竞品同款两拍）。返回 true=本次真的播了（供木桩晃动等联动） */
    playHitBarrier(): boolean {
        if (this._barrierPlayed) return false;
        this._barrierPlayed = true;
        AudioMgr.play('hit_wall', 1, 300);
        // 撞桩瞬间：睁眼正常版 → X 眼晕版（美术给的是两个状态模型）
        if (this._animator && this.stunSkin) {
            this._animator.swapSkin(this.stunSkin);
            this._renderers = this.getComponentsInChildren(MeshRenderer)
                .filter(r => !r.node.name.startsWith('quad_')); // 重采渲染器,受击变红作用到新模型
        }
        if (this._animator && this._animator.has('action')) {
            // 膨胀 clip 幅度小：放慢 0.55 倍拉长演出，再叠一层整体缩放脉冲放大「变大感」，
            // 眩晕衔接也顺势拖长（用户反馈原版膨胀太小、撞晕衔接太短）
            this._animator.play('action', false, 0.55);
            if (this.modelNode) {
                // 用户拍板：撞晕变大后保持这个体型不变回去（死亡/回收时 reinit 恢复基准）
                const b = this._baseScale;
                tween(this.modelNode)
                    .to(0.35, { scale: new Vec3(b.x * 1.32, b.y * 1.18, b.z * 1.32) }, { easing: 'backOut' })
                    .start();
            }
            const dur = 1.7;
            this.scheduleOnce(() => {
                // 美术设计意图：yun 晕 clip 配 Skin02 循环（用户看效果中；嫌摆得凶可降 speed 或换回 freeze）
                if (this.alive && this._animator && this._animator.has('stun')) this._animator.play('stun', true, 1, true);
            }, dur);
        } else if (this._animator && this._animator.has('stun')) {
            this._animator.play('stun', true, 1, true);
        }
        return true;
    }
    private _barrierPlayed = false;

    private _sustainRed = false;
    private _bloodPool: Node | null = null;

    /** 血泊：切割机开切后铺在鱼身下的大片血渍（竞品同款视觉） */
    private ensureBloodPool() {
        if (this._bloodPool && this._bloodPool.isValid) return;
        const parent = this.node.parent ?? this.node;
        const n = new Node('bloodPool');
        n.setParent(parent);
        const p = this.node.worldPosition;
        n.setWorldPosition(p.x + 0.3, p.y + 0.08, p.z + 0.3);
        n.setRotationFromEuler(0, Math.random() * 360, 0);
        Skin.groundQuad(n, 4.4, 3.4, 'blood_pool', new Color(150, 15, 15), 160);
        this._bloodPool = n;
    }

    /** 受击一刀。返回 true 表示这刀砍死了。sustainRed=切割机砍：鱼持续染红不恢复+血泊。
     *  fromWorld=砍击来源（主角/切割机位置），伤口落在被砍一侧；切割机三刀片一次铺三道伤口 */
    hit(damage: number, sustainRed = false, fromWorld?: Vec3): boolean {
        if (!this.alive) return false;
        if (sustainRed) { this._sustainRed = true; this.ensureBloodPool(); }
        this.hp -= damage;
        this.updateBloodBar();
        this.playHitFeedback();
        // 竞品口径：主角砍=鱼眼一道划痕；切割机=三道爪痕（明显更多）
        if (sustainRed) this.spawnCutterWounds(fromWorld); else this.spawnEyeWound();
        const ratio = this.hp / GameConfig.FISH_HP;
        if (this.hp <= 0) {
            this.state = FishState.Dead;
            return true;
        }
        if (ratio < 0.25 && this.state !== FishState.Stun) {
            this.state = FishState.Stun; // 残血眩晕
            // 已撞桩定格的不再重启动画（保持不摇摆）
            if (!this._barrierPlayed && this._animator && this._animator.has('stun')) this._animator.play('stun', true, 1, true);
        } else if (this.state === FishState.Blocked) {
            this.state = FishState.Struggle;
        }
        return false;
    }

    private playHitFeedback() {
        if (this._animator && this._animator.has('action')) {
            // 河豚有膨胀 clip：受击播一次膨胀（已进眩晕态则保持眩晕循环）
            // 已在撞桩眩晕状态就保持眩晕，不被受击膨胀打断
            if (!this._barrierPlayed) this._animator.play('action', false);
            // 竞品口径：主角砍鱼不红闪（鱼保持原色+伤口），红色只属于切割机的持续染红。
            // 0.35s/刀+0.15s 红闪会让鱼 40% 时间是红的，玩家看着就是「一直红」
            if (this._sustainRed) this.flashRed();
            return;
        }
        if (!this.modelNode) return;
        // 受击顿帧：快速压扁回弹；河豚随伤害逐渐膨胀
        const grow = this.skinId === 1 ? 1 + (1 - this.hp / GameConfig.FISH_HP) * 0.5 : 1;
        const s = this._baseScale;
        tween(this.modelNode)
            .to(0.05, { scale: new Vec3(s.x * grow * 1.12, s.y * grow * 0.9, s.z * grow * 1.12) })
            .to(0.1, { scale: new Vec3(s.x * grow, s.y * grow, s.z * grow) })
            .start();
        if (this._sustainRed) this.flashRed();
    }

    @property({ tooltip: '切割机伤口上限（聚集在刀口处两三道）' }) maxWounds = 3;
    private _wounds = 0;

    private _eyeWound = false;

    /** 局部取肉点 → 世界坐标（轴向备忘：身长沿 local z、+z=头端；X 眼在 (0.15,0.32,0.28) 附近） */
    private pointToWorld(local: Vec3, out?: Vec3): Vec3 {
        const host = this._animator && this._animator.modelNode ? this._animator.modelNode : this.node;
        const v = out ?? new Vec3();
        v.set(local.x, local.y, local.z);
        Vec3.transformMat4(v, v, host.worldMatrix);
        return v;
    }

    /** 主角挥砍取肉点（世界）：飞刀落点/伤痕/血雾/出肉都对齐这里 */
    getChopPointWorld(out?: Vec3): Vec3 { return this.pointToWorld(this.chopPoint, out); }
    /** 机器砍取肉点（世界） */
    getCutterPointWorld(out?: Vec3): Vec3 { return this.pointToWorld(this.cutterPoint, out); }

    /** 主角砍：鱼眼位置一道划痕（竞品飞刀砍头样式），只留一道不累计 */
    private spawnEyeWound() {
        if (this._eyeWound) return;
        this._eyeWound = true;
        const host = this._animator && this._animator.modelNode ? this._animator.modelNode : this.node;
        const w = new Node('woundEye');
        w.setParent(host);
        // 伤痕贴在主角取肉点上（FishLane Inspector 可调），y 略抬防止埋进背脊
        w.setPosition(this.chopPoint.x, Math.max(this.chopPoint.y, 0.42), this.chopPoint.z);
        w.setRotationFromEuler(0, 25, 0);
        const q = Skin.groundQuad(w, 0.2, 0.07, 'wound_single', new Color(150, 20, 20), 235);
        q.setPosition(0, 0, 0);
    }

    /** 切割机：伤痕聚集在机器取肉点（FishLane Inspector 可调），两三道成簇 */
    private spawnCutterWounds(fromWorld?: Vec3) {
        const host = this._animator && this._animator.modelNode ? this._animator.modelNode : this.node;
        const cz = this.cutterPoint.z, cx = this.cutterPoint.x;
        for (let i = 0; i < 3 && this._wounds < this.maxWounds; i++) {
            this._wounds++;
            const w = new Node('wound' + this._wounds);
            w.setParent(host);
            w.setPosition(cx + (Math.random() - 0.5) * 0.08, Math.max(this.cutterPoint.y, 0.42), cz + [-0.11, 0, 0.11][i % 3] + (Math.random() - 0.5) * 0.04);
            w.setRotationFromEuler(0, 60 + Math.random() * 60, 0);
            // 尺寸配 AI 伤痕图的 2.7:1 横构图（两道斜爪痕），别改回方形——会把爪痕竖向拉陡
            const q = Skin.groundQuad(w, 0.24, 0.09, 'wound', new Color(150, 20, 20), 235);
            q.setPosition(0, 0, 0);
        }
    }

    /** 受击变红 0.15s 即恢复（用户拍板：机器砍也是砍一下红一下，不保持常红） */
    private flashRed() {
        this.ensureMats();
        if (this._redMat) {
            this._renderers.forEach(r => { if (r.isValid) for (let i = 0; i < r.sharedMaterials.length; i++) r.setSharedMaterial(this._redMat!, i); });
            this.unschedule(this._restoreMat);
            this.scheduleOnce(this._restoreMat, 0.15);
        }
    }

    private _restoreMat = () => {
        if (!this._normalMat) return;
        this._renderers.forEach(r => { if (r.isValid) for (let i = 0; i < r.sharedMaterials.length; i++) r.setSharedMaterial(this._normalMat!, i); });
    };

    private ensureBloodBar() {
        if (this._barRoot && this._barRoot.isValid) return;
        const parent = this.node.parent ?? this.node;
        const root = new Node('hpbar');
        root.setParent(parent);
        // 底 + 血量条：竖立面片，update 里 billboard 朝相机。
        // 注意两张图的角色：hpbar_fill.png 是黑色条(做底槽)、hpbar_bg.png 是红色条(做血量)，
        // 和文件名语义相反——按名字直觉用会得到一根黑血条
        const W = Fish.BAR_W;
        // 竞品样式：红条=剩余血量，右端露出的深色段=已损血量（黑条图做底），底比填充大一圈当描边
        Skin.uprightQuad(root, W + 0.12, 0.56, 'hpbar_fill', new Color(55, 18, 18));
        this._barFill = Skin.uprightQuad(root, W, 0.46, 'hpbar_bg', new Color(230, 60, 50));
        this._barFill.setPosition(0, 0, 0.02); // 微凸向相机,压住底板
        this._barRoot = root;
    }

    private updateBloodBar() {
        const show = this.hp < GameConfig.FISH_HP && this.alive;
        if (show) this.ensureBloodBar();
        if (!this._barRoot || !this._barRoot.isValid) return;
        this._barRoot.active = show;
        const ratio = Math.max(0, this.hp / GameConfig.FISH_HP);
        if (this._barFill && this._barFill.isValid) {
            const W = Fish.BAR_W;
            this._barFill.setScale(W * ratio, 0.45, 1);
            this._barFill.setPosition(-W / 2 * (1 - ratio), 0, 0.02);
        }
    }

    /** 死亡演出后由 FishLane 回收 */
    playDie(onEnd?: () => void) {
        if (this._barRoot && this._barRoot.isValid) this._barRoot.active = false;
        this._restoreMat();
        if (this.bloodBar) this.bloodBar.active = false;
        if (this._animator && this._animator.has('die')) {
            this._animator.play('die', false);
            // 竞品：死亡演出后淡出消失。3D 模型用缩小收尾代替透明度淡出
            this.scheduleOnce(() => {
                const m = this._animator!.modelNode ?? this.node;
                tween(m).to(0.3, { scale: new Vec3(0.01, 0.01, 0.01) })
                    .call(() => onEnd && onEnd())
                    .start();
            }, 1.0);
            return;
        }
        if (this.modelNode) {
            tween(this.modelNode)
                .to(0.15, { scale: new Vec3(this._baseScale.x * 1.3, this._baseScale.y * 0.6, this._baseScale.z * 1.3) })
                .to(0.25, { scale: new Vec3(0.01, 0.01, 0.01) })
                .call(() => onEnd && onEnd())
                .start();
        } else {
            onEnd && onEnd();
        }
    }

    /** 重置以复用（对象池） */
    reinit() {
        this.hp = GameConfig.FISH_HP;
        this.state = FishState.Swim;
        this._barrierPlayed = false;
        this._sustainRed = false;
        if (this._bloodPool && this._bloodPool.isValid) { this._bloodPool.destroy(); this._bloodPool = null; }
        this._eyeWound = false;
        // modelNode 可能在 onLoad 之后才被注入（运行时生成的骨骼模型），
        // 那时才第一次取基准缩放；否则会把 Animator 设好的缩放打回 1。
        if (this.modelNode && !this._baseCaptured) {
            this._baseScale = this.modelNode.scale.clone();
            this._baseCaptured = true;
        }
        if (this.modelNode) this.modelNode.setScale(this._baseScale);
        this._restoreMat();
        if (this._barRoot && this._barRoot.isValid) { this._barRoot.destroy(); this._barRoot = null; }
        this._wounds = 0;
        this.updateBloodBar();
    }
}
