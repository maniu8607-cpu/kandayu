import { _decorator, Component, Node, Vec3, Prefab, instantiate } from 'cc';
import { GameConfig } from './GameConfig';
import { Customer, CustomerState } from './Customer';
import { Skin } from './Skin';
const { ccclass, property } = _decorator;

/**
 * 顾客队列：spawnPoint 进场 → queueHead 为队首，沿 queueDir 向后排。
 * 最后一名离 spawnPoint 超过阈值才补人（与参考一致的节流）。
 */
@ccclass('CustomerQueue')
export class CustomerQueue extends Component {
    @property({ type: Node, tooltip: '顾客入场点（拖空节点）' })
    spawnPoint: Node = null!;
    @property({ type: Node, tooltip: '队首位置=贩卖窗口前（拖空节点）' })
    queueHead: Node = null!;
    @property({ type: Node, tooltip: '队尾方向参考点：从 queueHead 指向它为排队方向（拖空节点）' })
    queueTail: Node = null!;
    @property({ type: Prefab, tooltip: '顾客预制体（静态模型用）' })
    customerPrefab: Prefab = null!;
    @property({ type: Node, tooltip: '顾客模板节点（带 Animator 的骨骼版，优先于 prefab；场景里设为隐藏）' })
    customerTemplate: Node = null!;
    @property({ tooltip: '初始队列人数' })
    initCount = 6;
    @property({ tooltip: '队内间距(px)。竞品约一个身位（55≈1.4u），93 会拉得稀稀拉拉' })
    gapPx = 55;

    private _list: Customer[] = [];
    /** 已成交离场中的顾客：从 _list 摘除后必须在这里继续驱动走位，
     *  否则会僵在队首原地循环最后的动画直到销毁（“排队却播 walk”的元凶之一） */
    private _leaving: Customer[] = [];

    get frontCustomer(): Customer | null {
        const c = this._list[0];
        return c && c.state === CustomerState.Queue ? c : null;
    }

    init() {
        const d = this.queueDir();
        for (let i = 0; i < this.initCount; i++) {
            const c = this.spawn();
            // 初始队列直接站好，并面向队首方向（售卖窗）——
            // 瞬移站位不经过行走，不设朝向就是模型默认脸冲镜头
            if (c) {
                this.assignTarget(c, i);
                c.node.setWorldPosition(c.targetPos);
                c.state = CustomerState.Queue;
                c.faceDir(-d.x, -d.z);
            }
        }
    }

    spawn(): Customer | null {
        // 模板节点优先（骨骼动画版），否则退回静态 prefab
        const src: any = this.customerTemplate || this.customerPrefab;
        if (!src) return null;
        const n = instantiate(src) as Node;
        n.active = true;
        n.setParent(this.node);
        n.setWorldPosition(this.spawnPoint.worldPosition);
        let c = n.getComponent(Customer);
        if (!c) {
            c = n.addComponent(Customer);
            c.modelNode = n.children[0] ?? n;
        }
        // 归零 FBX 内部网格出轴偏移
        const ch = n.children[0]?.children[0] ?? n.children[0];
        if (ch) ch.setPosition(0, ch.position.y, 0);
        if (n.children[0]) n.children[0].setPosition(0, n.children[0].position.y, 0);
        // 骨骼版顾客用 FBX 自带受光材质，别套 unlit
        if (!c.getComponent('Animator')) Skin.apply(n, 'T_yufu_BC');
        c.initAnimator();
        c.reinit();
        this._list.push(c);
        return c;
    }

    private queueDir(): Vec3 {
        const d = new Vec3();
        Vec3.subtract(d, this.queueTail.worldPosition, this.queueHead.worldPosition);
        d.y = 0;
        d.normalize();
        return d;
    }

    private assignTarget(c: Customer, index: number) {
        const d = this.queueDir();
        const gap = GameConfig.px(this.gapPx);
        const p = this.queueHead.worldPosition.clone();
        p.add(new Vec3(d.x * gap * index, 0, d.z * gap * index));
        c.targetPos.set(p);
    }

    /** 队首买完离场；参考行为：补人只发生在成交时（0.5s 后队尾进新人） */
    dismissFront() {
        const c = this._list.shift();
        if (!c) return;
        c.state = CustomerState.Leave;
        c.showBubble(false);
        // 离场：沿南侧车道走回入场点（直接照队列线走会穿过后面排队的人）
        const sp = this.spawnPoint.worldPosition;
        c.targetPos.set(sp.x, sp.y, sp.z + 1.1);
        this._leaving.push(c);
        this.scheduleOnce(() => { if (c.node.isValid) c.node.destroy(); }, 6);
        this.scheduleOnce(() => { this.spawn(); }, 0.5);
    }

    @property({ type: Node, tooltip: '主相机节点（气泡朝向用）' })
    cameraNode: Node = null!;

    update(dt: number) {
        if (this.cameraNode) {
            const cw = this.cameraNode.worldPosition;
            this._list.forEach(c => c.faceBubbleTo(cw));
        }
        // 离场顾客继续驱动（已不在 _list 里）
        this._leaving = this._leaving.filter(c => c.node && c.node.isValid);
        this._leaving.forEach(c => c.stepToTarget(dt));
        // 队列走位
        this._list.forEach((c, i) => {
            if (c.state === CustomerState.Leave) { c.stepToTarget(dt); return; }
            this.assignTarget(c, i);
            // 新进场的沿南侧车道走到自己槽位的横向位置，再拐进队列——直线走会穿过前面排队的人
            if (c.state === CustomerState.WalkIn && Math.abs(c.node.worldPosition.x - c.targetPos.x) > 0.8) {
                c.targetPos.z += 1.1;
            }
            const arrived = c.stepToTarget(dt);
            if (arrived && c.state === CustomerState.WalkIn) c.state = CustomerState.Queue;
        });
        // 补人在 dismissFront 里做（参考：成交才补人），这里只兜底防清空
        const inQueue = this._list.filter(c => c.state !== CustomerState.Leave);
        if (inQueue.length === 0) this.spawn();
    }
}
