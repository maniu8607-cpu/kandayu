import { _decorator, Component, Node, SkeletalAnimation, AnimationClip, Prefab, instantiate, Vec3 } from 'cc';
import { Skin } from './Skin';
const { ccclass, property } = _decorator;

/**
 * 骨骼动画驱动：把「Skin 预制体 + 若干动画 clip」组装成一个会动的角色。
 *
 * 美术给的结构是 Skin 与动画分离（三个角色共用一套骨骼，所以 Idle/Run/Attack 可复用）：
 *   skinPrefab = 渔夫_Skin / 阿牛_Skin / 大聪明_Skin / HeTun_Skin01 …
 *   clipIdle / clipRun / clipAction = Idle.fbx / Run.fbx / Attack.fbx 里的 clip
 *
 * 用法：挂在角色根节点上，运行时 build() 生成模型并播默认动作，之后用 play('run') 切换。
 */
@ccclass('Animator')
export class Animator extends Component {
    @property({ type: Prefab, tooltip: 'Skin 预制体（带骨骼的模型）' })
    skinPrefab: Prefab = null!;
    @property({ type: AnimationClip, tooltip: '待机动画' })
    clipIdle: AnimationClip = null!;
    @property({ type: AnimationClip, tooltip: '移动动画' })
    clipRun: AnimationClip = null!;
    @property({ type: AnimationClip, tooltip: '动作动画（砍/膨胀等）' })
    clipAction: AnimationClip = null!;
    @property({ type: AnimationClip, tooltip: '死亡动画' })
    clipDie: AnimationClip = null!;
    @property({ type: AnimationClip, tooltip: '眩晕动画（鱼专用，可空）' })
    clipStun: AnimationClip = null!;
    @property({ tooltip: '模型缩放' })
    modelScale = 1;
    @property({ tooltip: '模型朝向修正角 Yaw(度)' })
    modelYaw = 0;
    @property({ tooltip: '模型俯仰修正 Pitch(度)：模型躺/立不对时调 ±90' })
    modelPitch = 0;
    @property({ tooltip: '模型翻滚修正 Roll(度)' })
    modelRoll = 0;
    @property({ tooltip: '模型局部偏移（修正模型不在原点）' })
    modelOffset = new Vec3();
    @property({ tooltip: '自动在 start 时构建' })
    autoBuild = true;
    @property({ tooltip: '皮肤贴图名（resources/texture/skin/ 下）。骨骼模型必须用带 _sk 后缀的骨骼版贴图——静态版同名贴图 UV 不配套，套上是花的' })
    skinTex = '';

    /** 生成出来的模型节点（外部要转向就转它） */
    modelNode: Node = null!;
    private _anim: SkeletalAnimation = null!;
    private _cur = '';
    private _names: Record<string, string> = {};

    start() {
        if (this.autoBuild) this.build();
    }

    /** 组装：实例化 Skin → 挂 SkeletalAnimation → 注册全部 clip */
    build(): boolean {
        if (this.modelNode && this.modelNode.isValid) return true;
        if (!this.skinPrefab) { console.warn('[Animator] 缺 skinPrefab', this.node.name); return false; }
        // 关键：动画 clip 会每帧覆写骨骼根节点的 scale/rotation，
        // 所以缩放必须放在一层「包装节点」上（动画够不到它），否则怎么设都被打回 1。
        const wrap = new Node('ScaleWrap');
        wrap.setParent(this.node);
        wrap.setPosition(this.modelOffset.x, this.modelOffset.y, this.modelOffset.z);
        wrap.setScale(this.modelScale, this.modelScale, this.modelScale);
        wrap.setRotationFromEuler(0, this.modelYaw, 0);

        const m = instantiate(this.skinPrefab);
        m.setParent(wrap);
        m.setPosition(0, 0, 0);
        m.setRotationFromEuler(this.modelPitch, 0, this.modelRoll);
        // 外部转向作用于 wrap（动画改不到），姿态修正留在内层
        this.modelNode = wrap;

        this._anim = m.getComponent(SkeletalAnimation) ?? m.addComponent(SkeletalAnimation);
        // ⚠️ 必须先关烘焙、后赋 clips：赋 clips 时按当时模式创建动画状态，默认烘焙模式下
        // 创建的状态把采样写进烘焙通道，而蒙皮走实时节点——time 在走、骨骼纹丝不动，
        // 全部动画静默空转（角色僵一个姿势）。顺序错了就是这个全局症状。
        this._anim.useBakedAnimation = false;
        const clips: AnimationClip[] = [];
        const reg = (key: string, c: AnimationClip | null) => {
            if (!c) return;
            // 同一个 clip 资产可能被注册到两个槽（鱼的 idle/run 都是游动）。
            // 资产是共享的，二次改名会把先前的注册名弄丢，这里让后一个 key 映射到已注册名
            const dup = clips.indexOf(c);
            if (dup >= 0) { this._names[key] = c.name; return; }
            // clip 名全叫 "Take 001"，按 key 重命名以便区分
            c.name = key;
            this._names[key] = key;
            clips.push(c);
        };
        reg('idle', this.clipIdle);
        reg('run', this.clipRun);
        reg('action', this.clipAction);
        reg('die', this.clipDie);
        reg('stun', this.clipStun);
        if (!clips.length) { console.warn('[Animator] 没有任何 clip', this.node.name); return true; }
        this._anim.clips = clips;
        // 只套模型包装层，不套挂在角色根上的面片（脚下光环等）
        if (this.skinTex) Skin.apply(this.modelNode, this.skinTex);
        this.play('idle', true);
        return true;
    }

    private _oneShot = false;

    /** 播放；loop=false 时播完自动回 idle。force=true 强制打断一次性动作（切眩晕等） */
    /** 定格当前姿态（撞晕后不再摇摆用）。之后任意 play() 会自动恢复 */
    freeze() {
        if (this._anim) this._anim.pause();
    }

    play(key: string, loop = true, speed = 1, force = false) {
        if (!this._anim) return;
        this._anim.resume(); // freeze 过的先恢复，幂等
        const mapped = this._names[key] || this._names['idle'] || Object.values(this._names)[0];
        if (!mapped) return;
        // 一次性动作（砍/膨胀）播完前不被循环请求打断——
        // PlayerController 每帧 play(idle/run)，没这道闸攻击动作下一帧就被切掉
        if (loop && this._oneShot && !force) return;
        if (force) this._oneShot = false;
        if (this._cur === mapped && loop) return;
        this._cur = mapped;
        const state = this._anim.getState(mapped);
        if (!state) return;
        state.speed = speed;
        state.wrapMode = loop ? 2 /* Loop */ : 1 /* Normal */;
        this._anim.play(mapped);
        if (!loop) {
            this._oneShot = true;
            // 连打时旧回调作废（否则旧 FINISHED 会把新动作切回 idle）
            this._anim.off(SkeletalAnimation.EventType.FINISHED);
            this._anim.once(SkeletalAnimation.EventType.FINISHED, () => {
                this._oneShot = false;
                // 死亡动画播完停在最后一帧，不回 idle（尸体不能站起来游泳）
                if (this._cur === mapped && mapped !== 'die') this.play('idle', true);
            });
        } else {
            this._oneShot = false;
        }
    }

    /** 强制从头重播。节点未激活时 play 会被引擎静默丢弃（state 不启动），
     *  「先配置后入树」组装的对象入树后必须用这个重踢（普通 play 会被同名去重挡住） */
    restart(key: string, loop = true, speed = 1) {
        if (!this._anim) return;
        this._anim.resume();
        const mapped = this._names[key] || Object.values(this._names)[0];
        if (!mapped) return;
        this._cur = mapped;
        this._oneShot = false;
        const st = this._anim.getState(mapped);
        if (st) { st.speed = speed; st.wrapMode = loop ? 2 : 1; }
        this._anim.stop();
        this._anim.play(mapped);
    }

    /** 当前是否有该动作 */
    has(key: string) { return !!this._names[key]; }
    get current() { return this._cur; }

    /** 运行时换皮模型（鱼撞桩后从「正常版」切「晕版」用）。clips 注册表复用，调用方随后自行 play */
    swapSkin(pf: Prefab) {
        if (!pf || !this.modelNode || !this.modelNode.isValid) return;
        this.skinPrefab = pf;
        const wrap = this.modelNode;
        wrap.destroyAllChildren();
        const m = instantiate(pf);
        m.setParent(wrap);
        m.setPosition(0, 0, 0);
        m.setRotationFromEuler(this.modelPitch, 0, this.modelRoll);
        this._anim = m.getComponent(SkeletalAnimation) ?? m.addComponent(SkeletalAnimation);
        this._anim.useBakedAnimation = false; // 同 build()：先关烘焙再赋 clips，顺序反了动画空转
        const clips: AnimationClip[] = [];
        [this.clipIdle, this.clipRun, this.clipAction, this.clipDie, this.clipStun]
            .forEach(c => { if (c && clips.indexOf(c) < 0) clips.push(c); });
        this._anim.clips = clips;
        if (this.skinTex) Skin.apply(wrap, this.skinTex);
        this._cur = '';
        this._oneShot = false;
    }
}
