import { _decorator, Component, Node, Vec3, Sprite, SpriteFrame, Texture2D, resources, UITransform, Color } from 'cc';
import { GameConfig } from './GameConfig';
import { Skin } from './Skin';
import { Animator } from './Animator';
const { ccclass, property } = _decorator;

export enum CustomerState { WalkIn = 0, Queue = 1, Buying = 2, Leave = 3 }

/**
 * 顾客：从入场点沿路径走到队尾 → 随队伍前移 → 队首买 BUY_COUNT 份 → 离场。
 * 队列推进由 CustomerQueue 统一调度，本组件只管走位与状态。
 */
@ccclass('Customer')
export class Customer extends Component {
    @property({ type: Node, tooltip: '模型节点（转向用）' })
    modelNode: Node = null!;
    @property({ type: Node, tooltip: '头顶气泡（显示还要买几份，可空）' })
    bubbleNode: Node = null!;

    state = CustomerState.WalkIn;
    buyLeft = GameConfig.BUY_COUNT;
    /** 队列中的目标位（由 CustomerQueue 写入） */
    targetPos = new Vec3();

    private _speed = GameConfig.px(120);

    /** 头顶气泡（美术图 bubble_x0/x1/x2）,由 setBubble 切换 */
    private _bubbleQuad: Node | null = null;

    reinit() {
        this.state = CustomerState.WalkIn;
        this.buyLeft = GameConfig.BUY_COUNT;
        this.ensureBubble();
        this.setBubble(this.buyLeft);
        this.showBubble(false); // 默认收起，成为队首时 flashBubble 亮 2 秒
    }

    private ensureBubble() {
        if (this._bubbleQuad && this._bubbleQuad.isValid) return;
        if (!this.bubbleNode) {
            const n = new Node('bubble');
            n.setParent(this.node);
            n.setPosition(0, 2.0, 0);
            this.bubbleNode = n;
        }
        // 竖立面片,朝相机（父节点不转,顾客只转 modelNode,所以这里保持世界朝向）
        this._bubbleQuad = Skin.uprightQuad(this.bubbleNode, 1.0, 1.15, 'bubble_x2', new Color(255, 255, 255));
    }

    /** 按剩余购买数切图 */
    setBubble(left: number) {
        this.ensureBubble();
        const name = left >= 2 ? 'bubble_x2' : (left === 1 ? 'bubble_x1' : 'bubble_x0');
        const q = this._bubbleQuad;
        if (!q || !q.isValid) return;
        resources.load(`texture/ui/${name}/texture`, Texture2D, (err, tex) => {
            if (err || !tex || !q.isValid) return;
            Skin.setQuadTexture(q, tex);
        });
    }

    private _bobTime = 0;
    private _animator: Animator | null = null;

    /** 由 CustomerQueue 生成后调用 */
    initAnimator() {
        this._animator = this.getComponent(Animator);
        if (this._animator) {
            this._animator.build();
            if (this._animator.modelNode) this.modelNode = this._animator.modelNode;
        }
    }

    /** 面向某个方向（初始排队面向售卖窗用） */
    faceDir(dx: number, dz: number) {
        if (!this.modelNode) return;
        this.modelNode.setRotationFromEuler(0, Math.atan2(dx, dz) * 180 / Math.PI, 0);
    }

    /** 朝 targetPos 移动，到位返回 true；行走时带颠步 */
    stepToTarget(dt: number): boolean {
        const pos = this.node.worldPosition.clone();
        const to = new Vec3();
        Vec3.subtract(to, this.targetPos, pos);
        to.y = 0;
        const dist = to.length();
        const move = this._speed * dt;
        // 到位阈值取 max(单帧步长, 0.06)：帧率抖动时避免在临界距离上永远差一步、
        // 站在队位却持续播 walk 的边界病
        if (dist <= Math.max(move, 0.06)) {
            this.node.setWorldPosition(this.targetPos);
            if (this._animator) this._animator.play('idle', true);
            else if (this.modelNode) this.modelNode.setPosition(0, 0, 0);
            return true;
        }
        if (this._animator) this._animator.play('run', true);
        else {
            this._bobTime += dt;
            if (this.modelNode) this.modelNode.setPosition(0, Math.abs(Math.sin(this._bobTime * 10)) * 0.07, 0);
        }
        to.normalize();
        pos.add(new Vec3(to.x * move, 0, to.z * move));
        this.node.setWorldPosition(pos);
        if (this.modelNode) {
            const yaw = Math.atan2(to.x, to.z) * 180 / Math.PI;
            this.modelNode.setRotationFromEuler(0, yaw, 0);
        }
        return false;
    }

    showBubble(v: boolean) {
        if (this.bubbleNode) this.bubbleNode.active = v;
    }

    private _hideBubble = () => { if (this.bubbleNode && this.bubbleNode.isValid) this.bubbleNode.active = false; };

    /** 短暂亮一下气泡再收起（用户拍板：图标别常驻，1-2 秒即可） */
    flashBubble(sec = 2) {
        this.ensureBubble();
        if (this.bubbleNode) this.bubbleNode.active = true;
        this.unschedule(this._hideBubble);
        this.scheduleOnce(this._hideBubble, sec);
    }

    /** 吃饱成交：气泡换微笑表情亮 2 秒收起（图标别常驻） */
    showSmile() {
        this.ensureBubble();
        if (this.bubbleNode) this.bubbleNode.active = true;
        this.unschedule(this._hideBubble);
        this.scheduleOnce(this._hideBubble, 2);
        const q = this._bubbleQuad;
        if (!q || !q.isValid) return;
        resources.load('texture/ui/bubble_emoji/texture', Texture2D, (err, tex) => {
            if (err || !tex || !q.isValid) return;
            Skin.setQuadTexture(q, tex);
        });
    }

    /** 气泡朝向相机（每帧轻量：只在有气泡时算） */
    faceBubbleTo(camWorld: Vec3) {
        if (!this.bubbleNode || !this.bubbleNode.activeInHierarchy) return;
        const p = this.bubbleNode.worldPosition;
        const yaw = Math.atan2(camWorld.x - p.x, camWorld.z - p.z) * 180 / Math.PI;
        this.bubbleNode.setRotationFromEuler(0, yaw, 0);
    }
}
