import { _decorator, Component, Node, Vec3, Prefab, instantiate, Camera, tween, Label, ParticleSystem, director, Color, Widget } from 'cc';
import { GameConfig } from './GameConfig';
import { PlayerController } from './PlayerController';
import { Backpack, CarryType } from './Backpack';
import { FishLane } from './FishLane';
import { Fish, FishState } from './Fish';
import { Plate, PlateKind } from './Plate';
import { CustomerQueue } from './CustomerQueue';
import { ProcessLine } from './ProcessLine';
import { GuideArrow } from './GuideArrow';
import { FlyUtil } from './FlyUtil';
import { Skin } from './Skin';
import { Animator } from './Animator';
import { AudioMgr } from './AudioMgr';
const { ccclass, property } = _decorator;

enum GameState { Boot = 0, Play = 1, Win = 2 }

/**
 * 总调度：引导链、地贴触发、砍鱼、交付/售卖/金币流、相机、胜负。
 * 所有引用统一拖 Node，组件在 onLoad 解析（MCP 连线友好）。
 * 引导链步骤：0 wood → 1 chop → 2 pickMeat → 3 ovenIn → 4 pickCooked →
 * 5 sell → 6 pickCoin → 7 buyHelper → 8 buyCutter → 9 buyBelt → 10 expand → 11 chop2 → 胜利
 */
@ccclass('Game')
export class Game extends Component {
    // —— 核心引用（编辑器拖 Node）——
    @property({ type: Node, tooltip: '主角(挂 PlayerController+Backpack)' }) playerNode: Node = null!;
    @property({ type: Node, tooltip: '主相机节点' }) cameraNode: Node = null!;
    @property({ type: Node, tooltip: '鱼道(挂 FishLane)' }) fishLaneNode: Node = null!;
    @property({ type: Node, tooltip: '二期鱼道/鳄鱼(挂 FishLane，可空)' }) fishLane2Node: Node = null!;
    @property({ type: Node, tooltip: '顾客队列(挂 CustomerQueue)' }) customerQueueNode: Node = null!;
    @property({ type: Node, tooltip: '加工线(挂 ProcessLine)' }) processLineNode: Node = null!;
    @property({ type: Node, tooltip: '引导箭头(挂 GuideArrow)' }) guideArrowNode: Node = null!;
    @property({ type: [Node], tooltip: '地贴节点列表（按引导链顺序，挂 Plate；留空则用 platesRoot 子节点按名称排序）' }) plateNodes: Node[] = [];
    @property({ type: Node, tooltip: '地贴容器：子节点命名 P0_xxx…P11_xxx，按序号解析' }) platesRoot: Node = null!;

    // —— 场景锚点 ——
    @property({ type: Node, tooltip: '木桩父节点：子节点为各段木桩（初始隐藏，交付木头逐段点亮）' })
    woodPiles: Node = null!;
    @property({ type: Node, tooltip: '掉肉散布中心（拖空节点）' })
    meatDropCenter: Node = null!;
    @property({ type: Node, tooltip: '收银台金币堆叠点' })
    coinPan: Node = null!;
    @property({ type: Node, tooltip: '飞行物中转层' })
    flyLayer: Node = null!;
    @property({ type: Node, tooltip: '扩建时消失的围栏节点（可空）' })
    fenceNode: Node = null!;

    // —— 预制体 ——
    @property({ type: Prefab }) woodPrefab: Prefab = null!;
    @property({ type: Prefab }) rawMeatPrefab: Prefab = null!;
    @property({ type: Prefab }) coinPrefab: Prefab = null!;

    // —— 特效（kdy_fx 包）——
    @property({ type: Prefab, tooltip: '砍中血特效' }) hitFx: Prefab = null!;
    @property({ type: Prefab, tooltip: '眩晕星星' }) stunFx: Prefab = null!;
    @property({ type: Prefab, tooltip: '烤炉烟雾' }) smokeFx: Prefab = null!;
    @property({ type: Prefab, tooltip: '解锁升级特效' }) unlockFx: Prefab = null!;

    // —— UI（可空，缺省不显示）——
    @property({ type: Node, tooltip: '金币计数 Label 节点' }) coinLabelNode: Node = null!;
    @property({ type: Node, tooltip: 'DRAG TO MOVE 提示' }) dragTip: Node = null!;
    @property({ type: Node, tooltip: '结算页' }) endCard: Node = null!;

    // —— 可调旋钮 ——
    @property({ tooltip: '关闭场景雾（雾把整个玩法区洗成灰白，默认关）' }) disableFog = true;
    @property({ type: Node, tooltip: '拦鱼木桩（地编里已有的节点，开局自动隐藏，主角走到木桩地贴即显现）' })
    barrierNode: Node = null!;
    @property({ tooltip: '木桩显现耗时(s)：0=瞬间' }) barrierRevealTime = 0.35;
    @property({ tooltip: '相机跟随额外偏移（默认自动取开局时相机相对主角的位置）' }) cameraOffset = new Vec3(0, 0, 0);
    private _camFollowOffset = new Vec3();
    @property({ tooltip: '拖动提示钉在主角脚下（竞品样式）。关=保留场景里的固定屏幕位' }) dragTipFollow = true;
    @property({ tooltip: '拖动提示跟随时的屏幕偏移(UI px)：x右 y上' }) dragTipFollowOffset = new Vec3(0, -14, 0);
    private _tipUiPos = new Vec3();

    state = GameState.Boot;
    step = 0;
    coin = 0;

    private player: PlayerController = null!;
    private fishLane: FishLane = null!;
    private fishLane2: FishLane | null = null;
    private customerQueue: CustomerQueue | null = null;
    private processLine: ProcessLine = null!;
    private guideArrow: GuideArrow | null = null;
    private plates: Plate[] = [];
    private mainCamera: Camera | null = null;
    private coinLabel: Label | null = null;

    private _groundMeat: Node[] = [];
    private _barrierDone = false;
    private _chopTimer = 0;
    private _idleTimer = 0;
    private _deliverBusy = false;
    private _cutterOn = false;
    private _beltOn = false;
    private _helperOn = false;
    private _sellBusy = false;

    onLoad() {
        this.player = this.playerNode?.getComponent(PlayerController)!;
        this.fishLane = this.fishLaneNode?.getComponent(FishLane)!;
        this.fishLane2 = this.fishLane2Node?.getComponent(FishLane) ?? null;
        this.customerQueue = this.customerQueueNode?.getComponent(CustomerQueue) ?? null;
        this.processLine = this.processLineNode?.getComponent(ProcessLine)!;
        this.guideArrow = this.guideArrowNode?.getComponent(GuideArrow) ?? null;
        this.mainCamera = this.cameraNode?.getComponent(Camera) ?? null;
        this.coinLabel = this.coinLabelNode?.getComponent(Label) ?? null;
        let plateNodes = this.plateNodes.filter(Boolean);
        if (!plateNodes.length && this.platesRoot) {
            plateNodes = this.platesRoot.children.slice().sort((a, b) => {
                const na = parseInt(a.name.replace(/^P(\d+).*/, '$1'), 10) || 0;
                const nb = parseInt(b.name.replace(/^P(\d+).*/, '$1'), 10) || 0;
                return na - nb;
            });
        }
        this.plates = plateNodes.map(n => n.getComponent(Plate)!).filter(Boolean);
        // 缺引用报警而不是静默失效
        const required: [string, any][] = [
            ['player', this.player], ['fishLane', this.fishLane],
            ['processLine', this.processLine], ['flyLayer', this.flyLayer],
        ];
        for (const [k, v] of required) if (!v) console.warn(`[Game] 缺引用: ${k}`);
    }

    start() {
        this.applyTuning();
        this.state = GameState.Play;
        // 沿用编辑器摆好的机位：记录相机相对主角的初始偏移
        if (this.cameraNode && this.playerNode) {
            Vec3.subtract(this._camFollowOffset, this.cameraNode.worldPosition, this.playerNode.worldPosition);
            this._camFollowOffset.add(this.cameraOffset);
            // 竞品视野更大（一屏看到整个作业区+河），在地编机位基础上整体拉远
            this._camFollowOffset.multiplyScalar(this.camZoomOut);
        }
        // 换皮只给「没有骨骼动画」的静态模型用。
        // 骨骼模型自带 FBX 导入的受光材质，强行套 unlit 会让角色不受光、像贴纸浮在场景上。
        if (this.playerNode && !this.playerNode.getComponent(Animator)) Skin.apply(this.playerNode, 'T_yufu_BC');
        const helper = this.plates.find(p => p.plateId === 'buyHelper')?.unlockTarget;
        if (helper && !helper.getComponent(Animator)) {
            Skin.apply(helper, 'T_yufu_BC');
            const hch = helper.children[0];
            if (hch) hch.setPosition(0, hch.position.y, 0);
        }
        // 烤炉烟雾常驻挂到炉膛（盘中有肉才显示，ProcessLine 控制）
        if (this.smokeFx && this.processLine && !this.processLine.smokeNode) {
            const s = instantiate(this.smokeFx);
            s.setParent(this.processLine.ovenSlot);
            s.setPosition(0, 0.5, 0);
            s.active = false;
            this.processLine.smokeNode = s;
        }
        if (this.disableFog) {
            const sc = director.getScene();
            if (sc && (sc as any).globals) (sc as any).globals.fog.enabled = false;
        }
        // FishBlock 是地编阶段标记拦截点用的参考鱼模型，运行时必须藏掉，
        // 否则它趴在拦截位上和真鱼叠成「一条半鱼」
        director.getScene()?.walk(n => { if (n.name === 'FishBlock' || n.name === '鱼_拦停参考点') n.active = false; });
        this.fishLane?.init(3);
        this.customerQueue?.init();
        this.setupPlates();
        this.initBarrier();
        this.player?.onFirstDrag(() => {
            if (this.dragTip) this.dragTip.active = false;
            this.gotoStep(0);
        });
        this.updateCoinLabel();
        if (this.dragTip) this.dragTip.active = true;
        // 跟随模式下 Widget 每次重激活都会把提示拉回对齐位，和逐帧跟随打架，直接摘掉
        if (this.dragTip && this.dragTipFollow) this.dragTip.getComponent(Widget)?.destroy();
        AudioMgr.playLoop('bgm', 0.5);
        AudioMgr.playLoop('fish_swim', 0.2);
        // 预热换皮材质：apply 首载是异步的，不预热的话第一批掉肉/金币在贴图就位前是白模
        Skin.getMat('T_yu_BC', () => { });
        Skin.getMat('jinibi_2', () => { });
        // 引导目标先指向第一块地贴（未拖动前就显示）
        this.plates[0] && (this.plates[0].node.active = true);
        // 首屏运镜（竞品 StartYD 0/1）：相机先看拦鱼区的鱼、驻留 introCamHold 秒，
        // 再靠跟随 lerp 自然拉回主角；玩家提前拖动则立即结束驻留
        if (this.cameraNode && this.fishLane?.blockPoint) {
            const p = this.fishLane.blockPoint.worldPosition.clone().add(this._camFollowOffset);
            this.cameraNode.setWorldPosition(p);
            this._introHold = this.introCamHold;
        }
    }

    @property({ tooltip: '视野拉远系数：1=地编机位原样，>1 拉远（竞品一屏能看到整个作业区）' }) camZoomOut = 1.25;

    // ===== 数值调优（0 = 用 GameConfig 里的默认值，改这里立即生效不用碰代码）=====
    @property({ group: '数值调优', tooltip: '鱼游速 px/s（默认210）' }) tuneFishSpeedPx = 0;
    @property({ group: '数值调优', tooltip: '大鱼血量（默认600，60刀砍死）' }) tuneFishHp = 0;
    @property({ group: '数值调优', tooltip: '砍鱼间隔秒（默认0.35）' }) tuneAttackInterval = 0;
    @property({ group: '数值调优', tooltip: '主角每刀伤害（默认10）' }) tuneHitDamage = 0;
    @property({ group: '数值调优', tooltip: '切割机每刀伤害（默认10）' }) tuneCutterDamage = 0;
    @property({ group: '数值调优', tooltip: '主角每刀掉肉数（默认2）' }) tuneMeatPerChop = 0;
    @property({ group: '数值调优', tooltip: '切割机每刀出肉数（默认3）' }) tuneCutterMeat = 0;
    @property({ group: '数值调优', tooltip: '传送带上料间隔秒（默认0.8）' }) tuneBeltInterval = 0;
    @property({ group: '数值调优', tooltip: '背包生肉/熟肉上限（默认50）' }) tuneBagMeatMax = 0;
    @property({ group: '数值调优', tooltip: '背包金币视觉上限（默认30）' }) tuneBagCoinMax = 0;
    @property({ group: '数值调优', tooltip: '地面肉块上限（默认50，超了停砍）' }) tuneGroundMeatMax = 0;
    // 其他旋钮位置备忘：主角移速=Player 的 moveSpeedPx；解锁价格=各买贴的 needCoinOverride；
    // 鱼间距/密度=FishLane 的 queueGapPx/respawnDistPx；烤炉=ProcessLine 的 cookBatch/cookTime

    /** 把 Inspector 的调优值写回 GameConfig（>0 才覆盖） */
    private applyTuning() {
        const ov = (v: number, f: (x: number) => void) => { if (v > 0) f(v); };
        ov(this.tuneFishSpeedPx, v => GameConfig.FISH_SPEED_PX = v);
        ov(this.tuneFishHp, v => GameConfig.FISH_HP = v);
        ov(this.tuneAttackInterval, v => GameConfig.ATTACK_INTERVAL = v);
        ov(this.tuneHitDamage, v => GameConfig.HIT_DAMAGE = v);
        ov(this.tuneCutterDamage, v => GameConfig.CUTTER_DAMAGE = v);
        ov(this.tuneMeatPerChop, v => GameConfig.MEAT_PER_CHOP = v);
        ov(this.tuneCutterMeat, v => GameConfig.CUTTER_MEAT = v);
        ov(this.tuneBeltInterval, v => GameConfig.BELT_FEED_INTERVAL = v);
        ov(this.tuneBagMeatMax, v => GameConfig.BAG_MEAT_MAX = v);
        ov(this.tuneBagCoinMax, v => GameConfig.BAG_COIN_MAX = v);
        ov(this.tuneGroundMeatMax, v => GameConfig.GROUND_MEAT_MAX = v);
    }

    @property({ tooltip: '开场相机看鱼驻留秒数(竞品 2s)，0=关' }) introCamHold = 2;
    private _introHold = 0;

    private setupPlates() {
        this.plates.forEach((p, i) => {
            if (p.kind === PlateKind.Buy) {
                p.needCoin = p.needCoinOverride > 0 ? p.needCoinOverride
                    : GameConfig.UNLOCK_COSTS[Math.min(i, GameConfig.UNLOCK_COSTS.length - 1)];
            }
            p.node.active = i === 0;
        });
    }

    /** 木桩：地编里已有的节点，开局隐藏，主角踩木桩地贴时显现（不再是扔木头） */
    private initBarrier() {
        const segs = this.barrierSegments();
        segs.forEach(s => { s.active = false; });
    }

    private barrierSegments(): Node[] {
        if (this.barrierNode) return this.barrierNode.children.length ? this.barrierNode.children.slice() : [this.barrierNode];
        return this.woodPiles ? this.woodPiles.children.slice() : [];
    }

    /** 显现木桩：逐段弹出，全部显现后封锁鱼道 */
    private revealBarrier(onDone?: () => void) {
        // 编辑器里木桩的容器（如「拦鱼木桩」组）可能被整体设为隐藏——
        // 只点亮段节点没用，先把引用节点往上的祖先链全部打开（段本身留给下面逐段弹出）
        const base = this.barrierNode ?? this.woodPiles;
        for (let n = base?.parent; n && n.parent; n = n.parent) n.active = true;
        const segs = this.barrierSegments();
        if (!segs.length) { onDone && onDone(); return; }
        const step = segs.length > 1 ? this.barrierRevealTime / segs.length : 0;
        segs.forEach((s, i) => {
            this.scheduleOnce(() => {
                s.active = true;
                s.setScale(0.01, 0.01, 0.01);
                tween(s).to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
                AudioMgr.play('wood_throw', 1, 60);
                if (i === segs.length - 1) this.scheduleOnce(() => onDone && onDone(), 0.18);
            }, step * i);
        });
    }

    gotoStep(i: number) {
        this.step = i;
        const p = this.plates[i];
        if (p) {
            p.node.active = true;
            p.node.setScale(1, 1, 1);
            this.guideArrow?.setTarget(p.node);
        }
        this.reportProgress();
    }

    private reportProgress() {
        const marks: Record<number, number> = { 0: 0, 3: 25, 7: 50, 10: 75 };
        if (this.step in marks) console.log('[track] challenge progress', marks[this.step]);
    }

    update(dt: number) {
        if (this.state !== GameState.Play) return;
        this.updateIdleTip(dt);
        this.updateDragTipFollow();
        this.updatePlates(dt);
        this.updateChop(dt);
        this.updateMeatPickup();
        this.updateCutter(dt);
        this.updateSell(dt);
        this.updateAutomation(dt);
        this.updateFishStun(dt);
        this.updateCamera(dt);
        this.updateGuideRedirect();
        this.updateBagFullTip();
        // 无头探针可读的运行时状态
        (globalThis as any).__gameStats = {
            state: this.state, step: this.step, coin: this.coin,
            bagCount: this.player?.backpack.itemCount ?? -1,
            groundMeat: this._groundMeat.length,
            fishCount: this.fishLane?.fishes.length ?? -1,
            fishHp: this.fishLane?.frontFish?.hp ?? -1,
            backPan: this.processLine?.backCount ?? -1,
            sellPan: this.processLine?.sellCount ?? -1,
            coinPan: this.coinPan?.children.length ?? -1,
            playerPos: this.player ? [+this.player.node.worldPosition.x.toFixed(2), +this.player.node.worldPosition.z.toFixed(2)] : null,
            moving: this.player?.isMoving ?? false,
        };
    }

    /** 拖动提示钉在主角脚下：3D 世界坐标投到 UI 画布局部坐标（竞品摇杆贴主角样式） */
    private updateDragTipFollow() {
        if (!this.dragTipFollow || !this.dragTip || !this.dragTip.activeInHierarchy) return;
        if (!this.mainCamera || !this.playerNode || !this.dragTip.parent) return;
        this.mainCamera.convertToUINode(this.playerNode.worldPosition, this.dragTip.parent, this._tipUiPos);
        this.dragTip.setPosition(this._tipUiPos.x + this.dragTipFollowOffset.x, this._tipUiPos.y + this.dragTipFollowOffset.y, 0);
    }

    private updateIdleTip(dt: number) {
        if (!this.dragTip) return;
        if (this.player?.isMoving) { this._idleTimer = 0; if (this.dragTip.active) this.dragTip.active = false; }
        else {
            this._idleTimer += dt;
            if (this._idleTimer >= GameConfig.IDLE_TIP_TIME && !this.dragTip.active) this.dragTip.active = true;
        }
    }

    private updatePlates(dt: number) {
        if (!this.player) return;
        const pp = this.player.node.worldPosition;
        for (const p of this.plates) {
            if (!p.node.active || p.done) continue;
            const inside = p.contains(pp);
            p.setOccupied(inside);
            if (!inside) continue;
            switch (p.kind) {
                case PlateKind.Stand: break;
                case PlateKind.Deliver: this.tryDeliver(p); break;
                case PlateKind.Pickup: this.tryPickup(p); break;
                case PlateKind.Buy: this.tryPay(p); break;
            }
        }
    }

    private updateChop(dt: number) {
        const chopPlate = this.plates.find(p => (p.plateId === 'chop' || p.plateId === 'chop2') && p.occupied && p.node.active);
        if (!chopPlate || !this.fishLane) { this._chopTimer = 0; return; }
        const fish = this.fishLane.frontFish;
        if (!fish) return;
        // 参考行为：踩贴 + 鱼被拦停即开砍，不做距离判定（鱼体型巨大，距离检查会误伤）
        if (fish.state === FishState.Swim) return;
        this._chopTimer += dt;
        if (this._chopTimer < GameConfig.ATTACK_INTERVAL) return;
        this._chopTimer = 0;
        // TODO 挥刀动画：模型动画接入后在此播放
        const dead = fish.hit(GameConfig.HIT_DAMAGE);
        AudioMgr.play('chop', 1, 120);
        this.playChopSwing(fish.node.worldPosition);
        // 血特效打在鱼身上表面（朝主角一侧），比打在几何中心更看得见
        const fp = fish.node.worldPosition;
        const pp = this.player.node.worldPosition;
        const dx = pp.x - fp.x, dz = pp.z - fp.z;
        const dl = Math.hypot(dx, dz) || 1;
        this.spawnFx(this.hitFx, new Vec3(fp.x + dx / dl * 1.2, fp.y + 1.0, fp.z + dz / dl * 1.2), 0.9);
        this.dropMeat(GameConfig.MEAT_PER_CHOP, fish.node.worldPosition);
        if (dead) {
            fish.playDie(() => this.fishLane.removeFish(fish.node));
        }
    }

    @property({ tooltip: '特效整体缩放（kdy 特效包与本图尺度不一时调）' }) fxScale = 1;

    /** 短效特效：实例化→踢粒子播放→定时销毁 */
    private spawnFx(prefab: Prefab, worldPos: Vec3, life = 1) {
        if (!prefab) return;
        const fx = instantiate(prefab);
        fx.setParent(this.flyLayer);
        fx.setWorldPosition(worldPos);
        fx.setScale(this.fxScale, this.fxScale, this.fxScale);
        Game.kickFx(fx);
        this.scheduleOnce(() => { if (fx.isValid) fx.destroy(); }, life);
    }

    /** 挥刀动作（竞品 10 帧砍鱼动画的程序化替身）：面向鱼快速前倾劈砍回弹 */
    private playChopSwing(targetWorld: Vec3) {
        const model = this.player?.modelNode;
        if (!model) return;
        // 先转向鱼
        const dir = new Vec3();
        Vec3.subtract(dir, targetWorld, this.player.node.worldPosition);
        const yaw = Math.atan2(dir.x, dir.z) * 180 / Math.PI + this.player.modelYawOffset;
        model.setRotationFromEuler(0, yaw, 0);
        // 有骨骼动画就播它；同时叠加整体前倾——俯视角下斗笠盖住手部，
        // 不加外层前倾的话挥刀动作完全被帽子挡住看不见
        if (this.player.animator && this.player.animator.has('action')) {
            this.player.playAttack();
            tween(model)
                .to(0.08, { eulerAngles: new Vec3(26, yaw, 0) })
                .to(0.16, { eulerAngles: new Vec3(0, yaw, 0) })
                .start();
            return;
        }
        tween(model)
            .to(0.08, { eulerAngles: new Vec3(28, yaw, 0) })
            .to(0.12, { eulerAngles: new Vec3(0, yaw, 0) })
            .start();
    }

    /** kdy 特效 prefab 非自动播,手动踢全部粒子系统 */
    static kickFx(fx: Node) {
        fx.getComponentsInChildren(ParticleSystem).forEach(ps => {
            try { ps.stop(); ps.play(); } catch (e) { }
        });
    }

    /** 肉堆网格槽位：MeatDropCenter 为中心 3×2 六列,每叠 6 块升一层 */
    private static readonly MEAT_SLOTS = [
        [-0.55, 0], [0, 0], [0.55, 0], [-0.55, 0.55], [0, 0.55], [0.55, 0.55],
    ];
    private _meatDropIndex = 0;

    private dropMeat(count: number, fromWorld: Vec3) {
        if (!this.rawMeatPrefab || !this.meatDropCenter) return;
        if (this._groundMeat.length > GameConfig.GROUND_MEAT_MAX) return;
        for (let i = 0; i < count; i++) {
            const m = instantiate(this.rawMeatPrefab);
            Skin.apply(m, 'T_yu_BC'); // 静态肉模型的 FBX 材质不带贴图，不套皮是白模
            m.setParent(this.flyLayer);
            m.setWorldPosition(fromWorld);
            // 用户拍板：整齐码放——固定 6 槽网格循环、每 6 块升一层、统一朝向（不再随机散布）
            const c = this.meatDropCenter.worldPosition;
            const slot = Game.MEAT_SLOTS[this._meatDropIndex % Game.MEAT_SLOTS.length];
            const layer = Math.floor(this._meatDropIndex / Game.MEAT_SLOTS.length);
            this._meatDropIndex++;
            m.setRotationFromEuler(0, 0, 0);
            const to = new Vec3(c.x + slot[0], c.y + layer * 0.1, c.z + slot[1]);
            const local = new Vec3();
            this.flyLayer.inverseTransformPoint(local, to);
            FlyUtil.jumpTo(m, 0.2, local, GameConfig.px(150), () => {
                this._groundMeat.push(m);
                // 参考：第一块肉落地即亮拾肉引导（不等鱼死）
                if (this.step === 1) this.gotoStep(2);
            });
        }
    }

    private updateMeatPickup() {
        if (!this.player) return;
        const bag = this.player.backpack;
        if (bag.isFull) return;
        if (bag.carryType !== CarryType.None && bag.carryType !== CarryType.RawMeat) return;
        // 用户拍板：必须踩在拾肉地贴上才收集，不是走近就磁吸。
        // 竞品 DiTie_shiqu 同款：站上贴后按节拍逐块吸整堆，不做单块距离判定。
        // 半径必须比 Plate.contains 严：砍鱼贴离拾肉贴仅 1.4u，宽了会边砍边吸
        const pickPlate = this.plates.find(x => x.plateId === 'pickMeat');
        if (!pickPlate || !pickPlate.node.activeInHierarchy) return;
        const pw = pickPlate.node.worldPosition;
        const ppl = this.player.node.worldPosition;
        if (Math.hypot(ppl.x - pw.x, ppl.z - pw.z) > 1.1) return;
        for (let k = 0; k < 2; k++) { // 每帧最多吸 2 块（飞行 0.25s，节奏接近竞品 40/s）
            const m = this._groundMeat.pop();
            if (!m) { this._meatDropIndex = 0; break; } // 堆空重新从底层码
            this._meatDropIndex = Math.max(0, this._meatDropIndex - 1); // 槽位计数跟着堆走，从顶往下拆
            if (!m.isValid) continue;
            AudioMgr.play('pickup', 1, 80);
            bag.putItem(m, CarryType.RawMeat, GameConfig.JUMP_H_PICKUP_PX, () => {
                if (this.step === 2 && bag.itemCount >= 1) this.gotoStep(3);
            });
            if (bag.isFull) break;
        }
    }

    private tryDeliver(p: Plate) {
        if (this._deliverBusy || this.player.isMoving) return;
        const bag = this.player.backpack;
        switch (p.plateId) {
            case 'wood': {
                // 站上即显现地编里已有的木桩（不再扔木头）
                if (this._barrierDone) return;
                this._barrierDone = true;
                this._deliverBusy = true;
                p.done = true;
                p.hide();
                this.revealBarrier(() => {
                    this._deliverBusy = false;
                    this.onWoodDone();
                });
                break;
            }
            case 'ovenIn': {
                if (bag.carryType !== CarryType.RawMeat) return;
                const item = bag.takeItem();
                if (!item) return;
                this._deliverBusy = true;
                const done = () => {
                    if (this.step === 3 && this.processLine.backCount >= 1) this.gotoStep(4);
                };
                this._beltOn ? this.processLine.beltCarry(item, done) : this.processLine.receiveRaw(item, done);
                this.scheduleOnce(() => { this._deliverBusy = false; }, GameConfig.DELIVER_INTERVAL_SLOW);
                break;
            }
            case 'sell': {
                const item = bag.takeCooked();
                if (!item) return;
                this._deliverBusy = true;
                const idx = this.processLine.sellCount;
                const col = idx % 2, row = Math.floor(idx / 2);
                const localTo = new Vec3((col - 0.5) * GameConfig.px(30), row * GameConfig.stackPan, 0);
                FlyUtil.jumpToNode(item, 0.1, this.processLine.sellPan, localTo, GameConfig.px(GameConfig.JUMP_H_DELIVER_PX), () => {});
                this.scheduleOnce(() => { this._deliverBusy = false; }, GameConfig.DELIVER_INTERVAL_SLOW);
                break;
            }
        }
    }

    private onWoodDone() {
        this.fishLane.blocked = true;
        if (this.step === 0) this.gotoStep(1);
    }

    private tryPickup(p: Plate) {
        const bag = this.player.backpack;
        switch (p.plateId) {
            case 'pickMeat': break; // 地面肉靠磁吸，本贴只作站位引导
            case 'pickCooked': {
                if (this._deliverBusy) return;
                const n = this.processLine.backCount;
                if (n <= 0 || bag.isCookedFull) return;
                const item = this.processLine.backPan.children[n - 1];
                this._deliverBusy = true;
                AudioMgr.play('pickup');
                bag.putItem(item, CarryType.CookedMeat, GameConfig.JUMP_H_DELIVER_PX, () => {
                    if (this.step === 4 && bag.cookedCount >= 1) this.gotoStep(5);
                });
                this.scheduleOnce(() => { this._deliverBusy = false; }, GameConfig.DELIVER_INTERVAL_SLOW);
                break;
            }
            case 'pickCoin': {
                if (this._deliverBusy) return;
                const n = this.coinPan ? this.coinPan.children.length : 0;
                if (n <= 0) return;
                const coinNode = this.coinPan.children[n - 1];
                this._deliverBusy = true;
                AudioMgr.play('pickup');
                this.player.backpack.putCoin(coinNode, () => {
                    this.coin++;
                    this.updateCoinLabel();
                    if (this.step === 6) this.gotoStep(7);
                });
                this.scheduleOnce(() => { this._deliverBusy = false; }, GameConfig.COIN_FLY_INTERVAL);
                break;
            }
        }
    }

    private tryPay(p: Plate) {
        if (this._deliverBusy || this.coin <= 0) return;
        this._deliverBusy = true;
        AudioMgr.play('pickup');
        const coinNode = this.player.backpack.takeCoin();
        this.coin--;
        this.updateCoinLabel();
        if (coinNode) {
            const wp = coinNode.worldPosition.clone();
            coinNode.setParent(this.flyLayer);
            coinNode.setWorldPosition(wp);
            const local = new Vec3();
            this.flyLayer.inverseTransformPoint(local, p.node.worldPosition);
            FlyUtil.jumpTo(coinNode, 0.25, local, GameConfig.px(100), () => { coinNode.destroy(); });
        }
        // 数值与表现分离：模型币不够时只扣数值
        if (p.receiveCoin()) this.onPlateUnlocked(p);
        this.scheduleOnce(() => { this._deliverBusy = false; }, GameConfig.DELIVER_INTERVAL * 2);
    }

    private onPlateUnlocked(p: Plate) {
        p.hide();
        this.spawnFx(this.unlockFx, p.node.worldPosition, 1.5);
        const i = this.plates.indexOf(p);
        const unlock = p.unlockTarget;
        if (unlock) {
            unlock.active = true;
            unlock.setScale(0.01, 0.01, 0.01);
            tween(unlock).to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
        }
        switch (p.plateId) {
            case 'buyHelper': this._helperOn = true; this._helperNode = unlock; AudioMgr.play('unlock_device'); break;
            case 'buyCutter': this._cutterOn = true; this._cutterNode = unlock; this._cutterBaseY = unlock.position.y; AudioMgr.play('unlock_device'); break;
            case 'buyBelt': this._beltOn = true; AudioMgr.play('unlock_device'); break;
            case 'expand': AudioMgr.play('unlock_area'); this.onExpand(); return;
        }
        if (i >= 0 && i + 1 < this.plates.length) this.gotoStep(i + 1);
    }

    // —— 解锁后的自动化：帮手搬后桌→窗口 / 传送带吸地面肉进炉 ——
    private _beltTimer = 0;
    private _helperNode: Node | null = null;
    private _helperCarry: Node[] = [];
    private _helperPhase = 0; // 0=去后桌拿肉 1=送往售卖盘
    @property({ tooltip: '帮手单趟最多搬几块' }) helperCarryMax = 10;
    private updateAutomation(dt: number) {
        this.updateHelper(dt);
        if (this._beltOn) {
            this._beltTimer += dt;
            if (this._beltTimer >= GameConfig.BELT_FEED_INTERVAL && this._groundMeat.length > 0) {
                this._beltTimer = 0;
                const m = this._groundMeat.pop()!;
                this._meatDropIndex = Math.max(0, this._meatDropIndex - 1);
                if (m.isValid) this.processLine.beltCarry(m);
            }
        }
    }

    @property({ tooltip: '帮手移动速度=主角速度×该系数（竞品 200/400=0.5，太快像滑行）' })
    helperSpeedScale = 0.45;

    /** 帮手 AI：后桌↔售卖窗口来回搬肉（竞品行为：看得见的跑动搬运，不是逻辑传送） */
    private updateHelper(dt: number) {
        if (!this._helperOn || !this._helperNode || !this._helperNode.isValid || !this.processLine) return;
        const pl = this.processLine;
        const target = (this._helperPhase === 0 ? pl.backPan : pl.sellPan).worldPosition;
        const pos = this._helperNode.worldPosition.clone();
        const to = new Vec3(target.x - pos.x, 0, target.z - pos.z);
        const dist = to.length();
        const an = this._helperNode.getComponent(Animator);
        if (dist < 0.9) {
            if (this._helperPhase === 0) {
                // 一趟最多搬 helperCarryMax 块，顶头上叠一摞带走
                let k = 0;
                for (let i = 0; i < this.helperCarryMax; i++) {
                    const item = pl.takeBackItem();
                    if (!item) break;
                    const wp = item.worldPosition.clone();
                    item.setParent(this._helperNode);
                    item.setWorldPosition(wp);
                    tween(item).to(0.12, { position: new Vec3(0, 1.9 + k * 0.18, 0.25) }).start();
                    this._helperCarry.push(item);
                    k++;
                }
                if (k > 0) this._helperPhase = 1;
                // 后桌没肉：站着 idle 等
            } else {
                this._helperCarry.forEach(it => { if (it && it.isValid) pl.putSellItem(it); });
                this._helperCarry.length = 0;
                this._helperPhase = 0;
            }
            an?.play('idle', true);
            return;
        }
        const step = Math.min(dist, GameConfig.playerSpeed * this.helperSpeedScale * dt);
        to.multiplyScalar(1 / dist);
        pos.add(new Vec3(to.x * step, 0, to.z * step));
        this._helperNode.setWorldPosition(pos);
        if (an && an.modelNode) {
            an.modelNode.setRotationFromEuler(0, Math.atan2(to.x, to.z) * 180 / Math.PI, 0);
        }
        an?.play('run', true);
    }

    // —— 拦停头鱼的眩晕表现（头顶星星）——
    private _stunFishNode: Node | null = null;
    private _stunFxNode: Node | null = null;
    private _stunKick = 0;

    private updateFishStun(dt: number) {
        const fish = this.fishLane?.frontFish;
        const target = fish && fish.state !== FishState.Swim && fish.alive ? fish.node : null;
        // 晕圈是持续状态（竞品 yun 循环动画），粒子播完一轮会消失——周期性重踢
        if (target === this._stunFishNode) {
            if (this._stunFxNode && this._stunFxNode.isValid) {
                this._stunKick += dt;
                if (this._stunKick >= 1.1) { this._stunKick = 0; Game.kickFx(this._stunFxNode); }
            }
            return;
        }
        this._stunFishNode = target;
        if (this._stunFxNode && this._stunFxNode.isValid) this._stunFxNode.destroy();
        this._stunFxNode = null;
        if (target) AudioMgr.play('hit_wall', 1, 500);
        if (target && this.stunFx) {
            const fx = instantiate(this.stunFx);
            fx.setParent(target);
            // 要高过鱼背（鱼 scale 2 后背高 ~3），埋在体内就看不到「晕」了
            fx.setPosition(0, 3.9, 0);
            fx.setScale(this.fxScale, this.fxScale, this.fxScale);
            Game.kickFx(fx);
            this._stunFxNode = fx;
            this._stunKick = 0;
        }
    }

    private _cutterNode: Node | null = null;
    private _cutterTimer = 0;
    private _cutterBaseY = 0;

    /** 背包满头顶提示（竞品 max 气泡）。契约图 texture/ui/tip_small，缺图回退红块 */
    private _maxTip: Node | null = null;
    private updateBagFullTip() {
        const bag = this.player?.backpack;
        const full = !!bag && (bag.isFull || bag.isCookedFull);
        if (full && !this._maxTip && this.playerNode) {
            const n = new Node('bagFullTip');
            n.setParent(this.playerNode);
            n.setPosition(0, 2.7, 0);
            Skin.uprightQuad(n, 1.5, 1.15, 'tip_small', new Color(255, 80, 60));
            tween(n)
                .to(0.4, { scale: new Vec3(1.15, 1.15, 1.15) })
                .to(0.4, { scale: new Vec3(1, 1, 1) })
                .union().repeatForever().start();
            this._maxTip = n;
        } else if (!full && this._maxTip) {
            if (this._maxTip.isValid) this._maxTip.destroy();
            this._maxTip = null;
        }
        if (this._maxTip && this._maxTip.isValid) {
            // 高度动态跟着背包堆顶走：固定 2.7 会被 50 块的肉柱(4.5u)埋在中间
            const stack = Math.max(bag!.itemCount, bag!.cookedCount);
            this._maxTip.setPosition(0, 2.2 + stack * 0.09 + 0.6, 0);
            if (this.cameraNode) this._maxTip.setWorldRotation(this.cameraNode.worldRotation); // billboard
        }
    }

    private updateCutter(dt: number) {
        if (!this._cutterOn || !this.fishLane) return;
        const fish = this.fishLane.frontFish;
        if (!fish || fish.state === FishState.Swim) return;
        // 必须用独立计时器：updateChop 在主角不站砍鱼贴时每帧把 _chopTimer 清零，
        // 共用的话切割机只在主角也站着砍时才动，主角一走就停摆（实测过的坑）
        this._cutterTimer += dt;
        if (this._cutterTimer < GameConfig.ATTACK_INTERVAL) return;
        this._cutterTimer = 0;
        // 竞品切割机每刀播切割动画；本机器模型无动画资产，用「整机下压回弹」模拟上下砍
        if (this._cutterNode && this._cutterNode.isValid) {
            const bx = this._cutterNode.position.x, bz = this._cutterNode.position.z;
            tween(this._cutterNode)
                .to(0.05, { position: new Vec3(bx, this._cutterBaseY - 0.45, bz) })
                .to(0.16, { position: new Vec3(bx, this._cutterBaseY, bz) })
                .start();
        }
        // sustainRed：竞品切割机切的鱼整条持续染红+身下血泊，视觉冲击的核心
        const dead = fish.hit(GameConfig.CUTTER_DAMAGE, true);
        this.dropMeat(GameConfig.CUTTER_MEAT, fish.node.worldPosition);
        if (dead) fish.playDie(() => this.fishLane.removeFish(fish.node));
    }

    private updateSell(dt: number) {
        if (this._sellBusy || !this.customerQueue) return;
        const customer = this.customerQueue.frontCustomer;
        if (!customer) return;
        const item = this.processLine.takeSell();
        if (!item) return;
        this._sellBusy = true;
        const wp = item.worldPosition.clone();
        item.setParent(this.flyLayer);
        item.setWorldPosition(wp);
        const local = new Vec3();
        this.flyLayer.inverseTransformPoint(local, customer.node.worldPosition);
        tween(item)
            .to(0.1, { position: local, scale: new Vec3(0.5, 0.5, 0.5) })
            .call(() => {
                item.destroy();
                this.spawnCoins(GameConfig.COIN_PER_MEAT, customer.node.worldPosition.clone());
                customer.buyLeft--;
                customer.setBubble(customer.buyLeft);
                customer.showBubble(true);
                if (customer.buyLeft <= 0) this.customerQueue!.dismissFront();
                this._sellBusy = false;
                if (this.step === 5 && (this.coinPan?.children.length ?? 0) >= 1) this.gotoStep(6);
            })
            .start();
    }

    /** 金币从顾客位置连串抛物线喷到收银盘（竞品：0.03s/枚,弧高 300px） */
    private spawnCoins(count: number, fromWorld: Vec3) {
        if (!this.coinPrefab || !this.coinPan) return;
        let fired = 0;
        const fire = () => {
            const c = instantiate(this.coinPrefab);
            Skin.apply(c, 'jinibi_2'); // 金币 FBX 材质不带贴图，不套皮是白模
            c.setParent(this.flyLayer);
            c.setWorldPosition(fromWorld.x, fromWorld.y + 0.8, fromWorld.z);
            const idx = this.coinPan.children.length;
            const col = idx % 6, row = Math.floor(idx / 6);
            const gap = GameConfig.px(28);
            const to = new Vec3((col % 3 - 1) * gap, row * GameConfig.stackCoin, (col < 3 ? 0 : 1) * gap * 0.8);
            AudioMgr.play('pickup', 0.7, 90);
            FlyUtil.jumpToNode(c, 0.35, this.coinPan, to, GameConfig.px(300), () => {
                if (idx >= GameConfig.PAN_MAX) c.destroy();
            });
            fired++;
            if (fired < count) this.scheduleOnce(fire, GameConfig.COIN_FLY_INTERVAL);
        };
        fire();
    }

    private onExpand() {
        if (this.player) {
            this.player.allowRiverCross = true;
            // 扩建（打通壁垒）前南边界封在栅栏内侧，此刻放开让主角进南区
            this.player.boundMaxZ = 19;
        }
        if (this.fenceNode) {
            tween(this.fenceNode).to(0.5, { scale: new Vec3(1, 0.01, 1) })
                .call(() => { this.fenceNode.active = false; })
                .start();
        }
        // 打通壁垒 = 拆掉横贯作业区的中央围墙（WeiQiang_9/10/11/12，z≈1.7 一排）
        director.getScene()?.walk(n => {
            if ((n.name === '围墙_打通拆除' || (/^WeiQiang_(9|10|11|12)$/.test(n.name) && Math.abs(n.worldPosition.z - 1.7) < 0.5))) {
                tween(n).to(0.4, { scale: new Vec3(n.scale.x, 0.01, n.scale.z) })
                    .call(() => { n.active = false; })
                    .start();
            }
        });
        if (this.mainCamera) {
            const cam = this.mainCamera;
            tween(cam).to(GameConfig.EXPAND_CAMERA_TWEEN, { orthoHeight: cam.orthoHeight + GameConfig.px(150) }).start();
        }
        const next = this.plates.findIndex(p => p.plateId === 'chop2');
        if (next >= 0) this.gotoStep(next);
        if (this.fishLane2) {
            this.fishLane2.node.active = true;
            this.fishLane2.init(1);
            AudioMgr.playLoop('croc', 0.6);
            this.scheduleOnce(() => this.playEnding(), 1.5);
        } else {
            this.scheduleOnce(() => this.playEnding(), 2);
        }
    }

    private playEnding() {
        this.state = GameState.Win;
        AudioMgr.stopLoop('bgm');
        AudioMgr.play('win');
        const target = this.fishLane2?.fishes[0] ?? this.player.node;
        const to = target.worldPosition.clone().add(this._camFollowOffset);
        tween(this.cameraNode).to(GameConfig.END_CAMERA_TWEEN, { worldPosition: to }).start();
        this.scheduleOnce(() => {
            if (this.endCard) this.endCard.active = true;
            console.log('[track] challenge progress', 100);
            this.scheduleOnce(() => console.log('[sdk] jump store'), GameConfig.JUMP_STORE_DELAY);
        }, GameConfig.WIN_DELAY);
    }

    /**
     * 竞品 showZhiyin：当前引导是「花钱解锁」但金币不够时，箭头改指能推进赚钱的环节
     * （不改引导 step，钱攒够了箭头自动指回解锁贴）。优先级照抄竞品改道表。
     */
    private updateGuideRedirect() {
        if (!this.guideArrow) return;
        const p = this.plates[this.step];
        if (!p || !p.node.activeInHierarchy) return;
        if (p.kind !== PlateKind.Buy || this.coin >= p.needCoin - p.paidCoin) {
            this.guideArrow.setTarget(p.node);
            return;
        }
        const find = (id: string) => this.plates.find(x => x.plateId === id);
        const bag = this.player?.backpack;
        let t = undefined as Plate | undefined;
        if (this.coinPan && this.coinPan.children.length > 0) t = find('pickCoin');
        else if ((this.processLine?.sellCount ?? 0) > 0 || (bag?.cookedCount ?? 0) > 0) t = find('sell');
        else if ((this.processLine?.backCount ?? 0) > 0) t = find('pickCooked');
        else if ((bag?.itemCount ?? 0) > 0) t = find('ovenIn');
        else if (this._groundMeat.length > 0) t = find('pickMeat');
        else t = find('chop');
        if (t) this.guideArrow.setTarget(t.node);
    }

    private updateCamera(dt: number) {
        if (!this.cameraNode || !this.player || this.state !== GameState.Play) return;
        if (this._introHold > 0) {
            this._introHold -= dt;
            if (this.player.isMoving) this._introHold = 0; // 玩家动了就不耗着
            return;
        }
        const t = this.player.node.worldPosition.clone().add(this._camFollowOffset);
        const cur = this.cameraNode.worldPosition;
        const k = GameConfig.CAMERA_SMOOTH;
        this.cameraNode.setWorldPosition(cur.x + (t.x - cur.x) * k, cur.y + (t.y - cur.y) * k, cur.z + (t.z - cur.z) * k);
    }

    private updateCoinLabel() {
        if (!this.coinLabel) return;
        this.coinLabel.string = String(this.coin);
        // 数字滚动反馈：小脉冲
        tween(this.coinLabelNode)
            .to(0.06, { scale: new Vec3(1.25, 1.25, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();
    }
}
