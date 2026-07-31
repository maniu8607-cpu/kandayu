import { _decorator, Component, Node, Vec3, Vec2, input, Input, EventTouch, Color, MeshRenderer, Material, utils, primitives } from 'cc';
import { GameConfig } from './GameConfig';
import { Backpack } from './Backpack';
import { Skin } from './Skin';
import { Animator } from './Animator';
const { ccclass, property } = _decorator;

/**
 * 单指拖动控制：按下记录起点，拖动矢量=移动方向（虚拟摇杆，无 UI 也能用），松手即停。
 * 屏幕拖动方向按相机朝向换算到 XZ 平面（相机相对移动），相机斜置多少度都不用调系数。
 */
@ccclass('PlayerController')
export class PlayerController extends Component {
    @property({ type: Node, tooltip: '角色模型节点（用于转向）' })
    modelNode: Node = null!;
    @property({ type: Node, tooltip: '主相机节点（拖动方向按它的朝向换算）' })
    cameraNode: Node = null!;
    @property({ tooltip: '主角移速 px/s：0=用 GameConfig.PLAYER_SPEED_PX(400)。手感快慢在这调，不影响帮工' })
    moveSpeedPx = 0;
    @property({ tooltip: '摇杆满速半径(屏幕像素)' })
    stickRadius = 60;
    @property({ tooltip: '活动范围 X 最小值(世界)' }) boundMinX = -17;
    @property({ tooltip: '活动范围 X 最大值(世界)' }) boundMaxX = 23;
    @property({ tooltip: '活动范围 Z 最小值(世界)' }) boundMinZ = -27;
    @property({ tooltip: '活动范围 Z 最大值(世界)' }) boundMaxZ = 19;
    @property({ tooltip: '北河阻挡 Z 起（实测）' }) river1MinZ = -11.2;
    @property({ tooltip: '北河阻挡 Z 止（实测南岸线）' }) river1MaxZ = -6.9;
    @property({ tooltip: '南河阻挡 Z 起（实测）' }) river2MinZ = 7.0;
    @property({ tooltip: '南河阻挡 Z 止（实测）' }) river2MaxZ = 11.8;
    @property({ tooltip: '主角模型朝向修正角(度)：模型出轴不对时调 ±90/180' }) modelYawOffset = 0;
    /** 扩建后设 true 允许过河 */
    allowRiverCross = false;

    private _dragging = false;
    private _origin = new Vec2();
    private _moveDir = new Vec3();
    private _speedScale = 0;
    private _firstDragCb: (() => void) | null = null;

    /** 本帧是否在移动（外部读） */
    get isMoving() { return this._dragging && this._speedScale > 0.01; }
    get animator() { return this._animator; }
    @property({ tooltip: '砍鱼动作播放倍速：让 1s 的挥刀动画在一刀间隔(0.35s)内完整挥完' })
    attackAnimSpeed = 2.6;
    /** 播一次砍鱼动作（Game 每刀调用） */
    playAttack() { if (this._animator && this._animator.has('action')) this._animator.play('action', false, this.attackAnimSpeed); }
    get backpack() { return this.getComponent(Backpack)!; }

    private _animator: Animator | null = null;

    start() {
        // 有骨骼动画时：模型由 Animator 生成,朝向也转它
        this._animator = this.getComponent(Animator);
        if (this._animator) {
            this._animator.build();
            if (this._animator.modelNode) this.modelNode = this._animator.modelNode;
        }
        // 静态 FBX 内部网格子节点带出轴偏移（场景覆盖不持久），运行时归零 XZ
        const ch = this.modelNode?.children[0];
        if (ch && !this._animator) ch.setPosition(0, ch.position.y, 0);
        // 脚下光环（竞品同款站位指示）
        const ring = new Node('FootRing');
        ring.setParent(this.node);
        ring.setPosition(0, 0.04, 0);
        Skin.groundQuad(ring, 1.5, 1.5, 'foot_ring', new Color(180, 240, 255), 200);
    }

    onFirstDrag(cb: () => void) { this._firstDragCb = cb; }

    onEnable() {
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        // 桌面浏览器鼠标不会被模拟成 TOUCH，必须双注册
        input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
    }
    onDisable() {
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        input.off(Input.EventType.MOUSE_UP, this.onMouseUp, this);
    }

    private _mouseHeld = false;
    private onMouseDown(e: any) {
        this._mouseHeld = true;
        this._dragging = true;
        const p = e.getUILocation();
        this._origin.set(p.x, p.y);
        this._speedScale = 0;
    }
    private onMouseMove(e: any) {
        if (!this._mouseHeld) return;
        this.onTouchMove(e);
    }
    private onMouseUp() {
        this._mouseHeld = false;
        this.onTouchEnd();
    }

    private onTouchStart(e: EventTouch) {
        this._dragging = true;
        e.getUILocation(this._origin);
        this._speedScale = 0;
    }

    private onTouchMove(e: EventTouch) {
        if (!this._dragging) return;
        const cur = e.getUILocation();
        const dx = cur.x - this._origin.x;
        const dy = cur.y - this._origin.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 2) { this._speedScale = 0; return; }
        // 相机相对映射：屏幕右 = 相机 right 的水平投影，屏幕上 = 相机 forward 的水平投影
        if (this.cameraNode) {
            const f = this.cameraNode.forward; // 指向视线方向
            const fx = f.x, fz = f.z;
            const flen = Math.sqrt(fx * fx + fz * fz) || 1;
            const ufx = fx / flen, ufz = fz / flen;      // 屏幕上
            const rx = -ufz, rz = ufx;                    // 屏幕右 = 上向量绕 Y 顺时针 90°
            this._moveDir.set(rx * dx + ufx * dy, 0, rz * dx + ufz * dy);
        } else {
            this._moveDir.set(dx, 0, -dy);
        }
        this._moveDir.normalize();
        this._speedScale = 1; // 参考实现：方向归一化后恒定全速，摇杆偏移只是视觉
        if (this._firstDragCb) { const cb = this._firstDragCb; this._firstDragCb = null; cb(); }
        // 摇杆跟手：拖太远时原点跟上来，转向更灵敏
        if (len > this.stickRadius * 1.5) {
            const k = (len - this.stickRadius * 1.5) / len;
            this._origin.x += dx * k;
            this._origin.y += dy * k;
        }
    }

    private onTouchEnd() {
        this._dragging = false;
        this._speedScale = 0;
    }

    private _bobTime = 0;

    private _knife: Node | null = null;
    /** 手上的刀节点（Game 的飞刀砍击要临时藏手刀、克隆飞行体） */
    get knifeNode() { return this._knife; }

    /** 手持菜刀（竞品渔夫持刀挥砍）：挂在右手骨上随动作走。模型包没有刀网格，程序拼一把 */
    private ensureKnife() {
        if (this._knife && this._knife.isValid) return;
        if (!this._animator || !this._animator.modelNode) return;
        let hand: Node | null = null;
        this._animator.modelNode.walk(n => { if (!hand && n.name === 'Bip001 R Hand') hand = n; });
        if (!hand) return;
        const knife = new Node('Knife');
        knife.setParent(hand);
        knife.setPosition(0.1, 0, 0);
        // 俯视相机下竖直刀面是一条细缝，倾一点让刀面吃到视角
        knife.setRotationFromEuler(35, 0, 0);
        const mkBox = (name: string, w: number, h: number, l: number, c: Color, px: number, py: number) => {
            // quad_ 前缀：Skin.apply 换皮是异步的，回调时会把整树 MeshRenderer 套上角色图集，
            // 只有 quad_ 开头的节点会被跳过（第16轮脚下光环同款坑）
            const n = new Node('quad_' + name);
            n.setParent(knife);
            n.setPosition(px, py, 0);
            const mr = n.addComponent(MeshRenderer);
            mr.mesh = utils.MeshUtils.createMesh(primitives.box({ width: w, height: h, length: l }));
            const m = new Material();
            m.initialize({ effectName: 'builtin-unlit' });
            m.setProperty('mainColor', c);
            mr.setSharedMaterial(m, 0);
        };
        mkBox('blade', 0.42, 0.28, 0.05, new Color(216, 224, 232, 255), 0.26, -0.08);
        mkBox('handle', 0.2, 0.06, 0.06, new Color(122, 82, 42, 255), 0, 0.03);
        this._knife = knife;
    }

    update(dt: number) {
        this.ensureKnife();
        // 骨骼动画接管时切 run/idle,否则退回程序化颠步
        if (this._animator) {
            this._animator.play(this.isMoving ? 'run' : 'idle', true);
        } else if (this.modelNode) {
            if (this.isMoving) {
                this._bobTime += dt;
                this.modelNode.setPosition(0, Math.abs(Math.sin(this._bobTime * 11)) * 0.09, 0);
            } else if (this.modelNode.position.y !== 0) {
                this.modelNode.setPosition(0, 0, 0);
            }
        }
        if (!this.isMoving) return;
        const speed = this.moveSpeedPx > 0 ? GameConfig.px(this.moveSpeedPx) : GameConfig.playerSpeed;
        const step = speed * this._speedScale * dt;
        const p = this.node.position.clone();
        p.add(new Vec3(this._moveDir.x * step, 0, this._moveDir.z * step));
        p.x = Math.min(this.boundMaxX, Math.max(this.boundMinX, p.x));
        p.z = Math.min(this.boundMaxZ, Math.max(this.boundMinZ, p.z));
        // 河道阻挡（两条沿 X 的河，按 Z 带钳制）：按进入方向弹回近侧岸
        if (!this.allowRiverCross) {
            const oz = this.node.position.z;
            if (p.z > this.river1MinZ && p.z < this.river1MaxZ) {
                p.z = oz <= this.river1MinZ ? this.river1MinZ : (oz >= this.river1MaxZ ? this.river1MaxZ : p.z);
            }
            if (p.z > this.river2MinZ && p.z < this.river2MaxZ) {
                p.z = oz <= this.river2MinZ ? this.river2MinZ : (oz >= this.river2MaxZ ? this.river2MaxZ : p.z);
            }
        }
        this.node.setPosition(p);
        if (this.modelNode) {
            // 平滑转向移动方向
            const targetYaw = Math.atan2(this._moveDir.x, this._moveDir.z) * 180 / Math.PI + this.modelYawOffset;
            const e = this.modelNode.eulerAngles;
            let delta = targetYaw - e.y;
            while (delta > 180) delta -= 360;
            while (delta < -180) delta += 360;
            this.modelNode.setRotationFromEuler(0, e.y + delta * Math.min(1, dt * 12), 0);
        }
    }
}
