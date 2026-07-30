import { _decorator, Component, Node, Vec3, instantiate, Prefab, Color } from 'cc';
import { GameConfig } from './GameConfig';
import { Skin } from './Skin';
const { ccclass, property } = _decorator;

/**
 * 引导箭头链：从主角脚下向当前目标铺一串小箭头（32px 一枚，从 70px 起），
 * 目标上方悬浮一个大箭头上下浮动。目标为空时全部隐藏。
 */
@ccclass('GuideArrow')
export class GuideArrow extends Component {
    @property({ type: Node, tooltip: '主角节点' })
    playerNode: Node = null!;
    @property({ type: Prefab, tooltip: '小箭头预制体（可空=用代码方块占位）' })
    arrowPrefab: Prefab = null!;
    @property({ type: Node, tooltip: '目标上方的大箭头节点（可空）' })
    bigArrow: Node = null!;
    @property({ tooltip: '箭头间距(px)' })
    gapPx = 32;
    @property({ tooltip: '起始偏移(px)' })
    startPx = 45;
    @property({ tooltip: '小箭头尺寸(世界单位)' })
    arrowSize = 0.7;

    target: Node | null = null;
    private _arrows: Node[] = [];
    private _time = 0;

    onLoad() {
        // 大箭头缺省时代码建一个（绿色下压标记）
        if (!this.bigArrow) {
            this.bigArrow = new Node('BigArrowAuto');
            this.bigArrow.setParent(this.node);
            const q = Skin.groundQuad(this.bigArrow, 1.3, 1.3, 'arrow_tri', new Color(60, 230, 120), 255);
            q.setPosition(0, 0, 0);
        }
    }

    setTarget(t: Node | null) { this.target = t; }

    update(dt: number) {
        this._time += dt;
        if (!this.target || !this.target.active || !this.playerNode) {
            this._arrows.forEach(a => a.active = false);
            if (this.bigArrow) this.bigArrow.active = false;
            return;
        }
        const from = this.playerNode.worldPosition;
        const to = this.target.worldPosition;
        const dir = new Vec3(to.x - from.x, 0, to.z - from.z);
        const dist = dir.length();
        dir.normalize();
        const gap = GameConfig.px(this.gapPx);
        const start = GameConfig.px(this.startPx);
        // 不要再 -1：目标近时会算成 0 枚，开局阶段整条链是空的（引导形同虚设）
        const count = Math.max(0, Math.floor((dist - start) / gap));

        while (this._arrows.length < count) {
            let a: Node;
            if (this.arrowPrefab) {
                a = instantiate(this.arrowPrefab);
                a.setParent(this.node);
            } else {
                a = new Node('arrow');
                a.setParent(this.node);
                // 可见箭头：贴地小三角（缺图回退青色块）
                Skin.groundQuad(a, this.arrowSize, this.arrowSize, 'arrow_tri', new Color(60, 220, 220), 230);
            }
            this._arrows.push(a);
        }
        const yaw = Math.atan2(dir.x, dir.z) * 180 / Math.PI;
        for (let i = 0; i < this._arrows.length; i++) {
            const a = this._arrows[i];
            const show = i < count;
            a.active = show;
            if (!show) continue;
            const d = start + gap * i;
            a.setWorldPosition(from.x + dir.x * d, from.y + 0.12, from.z + dir.z * d);
            a.setRotationFromEuler(0, yaw, 0);
        }
        if (this.bigArrow) {
            this.bigArrow.active = true;
            // 悬太高会飘离目标，压低到目标正上方一点，弹跳更醒目
            const bob = Math.sin(this._time * 7) * GameConfig.px(12);
            this.bigArrow.setWorldPosition(to.x, to.y + GameConfig.px(55) + bob, to.z);
        }
    }
}
