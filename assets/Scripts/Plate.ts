import { _decorator, Component, Node, Vec3, tween, Color, Label, RenderRoot2D } from 'cc';
import { GameConfig } from './GameConfig';
import { Skin } from './Skin';
const { ccclass, property } = _decorator;

export enum PlateKind {
    Stand = 0,    // 站立触发（放木桩/砍鱼）
    Deliver = 1,  // 交付（背上物品飞出去）
    Pickup = 2,   // 拾取（目标堆里的东西飞到背上）
    Buy = 3,      // 金币导入解锁
}

/**
 * 功能地贴：主角站进触发半径 → 通知 Game 开始对应行为，离开即停。
 * 触发检测统一在 update 里测距（与参考一致），不用物理碰撞。
 * 半径按类型取 GameConfig 的 60/100/170px，可用 radiusOverridePx 单独调。
 */
@ccclass('Plate')
export class Plate extends Component {
    @property({ tooltip: '地贴类型 0站立 1交付 2拾取 3购买' })
    kind: PlateKind = PlateKind.Stand;
    @property({ tooltip: '业务ID（Game 里 switch 用，如 wood/chop/ovenIn/ovenOut/sell/coin/buyHelper/buyCutter/buyBelt/expand/chop2）' })
    plateId = '';
    @property({ tooltip: '触发半径覆盖(px)，0=按类型默认' })
    radiusOverridePx = 0;
    @property({ tooltip: '解锁所需金币（Buy 类型用），0=按引导序列自动' })
    needCoinOverride = 0;
    @property({ type: Node, tooltip: '进度/高亮显示节点（可空）' })
    highlightNode: Node = null!;
    @property({ type: Node, tooltip: 'Buy 型解锁后揭示的设备节点（可空）' })
    unlockTarget: Node = null!;

    /** Buy 型：已导入金币数 */
    paidCoin = 0;
    needCoin = 0;
    /** 是否已完成（Buy 完成后地贴消失） */
    done = false;
    /** 主角当前是否站在上面 */
    occupied = false;

    private _baseWhite: Node | null = null;
    private _baseGreen: Node | null = null;
    private _greenSize = { x: 1, z: 1 };
    private _priceLabel: Label | null = null;
    private _lastRem = -1;

    onLoad() {
        // 可视化：底框（白/绿两张，踩上切绿）+ 业务图标。素材缺失时回退色块。
        const buy = this.kind === PlateKind.Buy;
        const base = buy ? 'plate_mid' : 'plate_small';
        const s = buy ? 2.4 : 1.9;
        this._baseWhite = Skin.groundQuad(this.node, s, s * 0.72, `${base}_white`, new Color(255, 255, 255), 140);
        this._baseGreen = Skin.groundQuad(this.node, s, s * 0.72, `${base}_green`, new Color(80, 220, 100), 170);
        this._baseGreen.active = false;
        const iconMap: Record<string, string> = {
            chop: 'plate_footprint', chop2: 'plate_footprint', wood: 'plate_storage',
            ovenIn: 'plate_cook', pickCooked: 'plate_cook', sell: 'plate_sell',
            pickMeat: 'plate_meat', pickCoin: 'plate_cashier',
            buyHelper: 'plate_helper', buyCutter: 'plate_knife', buyBelt: 'plate_belt', expand: 'plate_expand',
        };
        const icon = iconMap[this.plateId];
        if (icon) {
            const ic = Skin.groundQuad(this.node, s * 0.55, s * 0.55, icon, new Color(60, 60, 60), 120);
            ic.setPosition(0, 0.05, 0);
        }
        // 买类贴：金币付款进度（绿底从中心涨满）+ 剩余价格数字（竞品样式）
        if (buy) {
            this._greenSize = { x: s, z: s * 0.72 };
            if (this._baseGreen) this._baseGreen.setScale(0.01, 0.01, 1); // 初始 0 进度
            this.buildPriceTag(s);
        }
    }

    /** 价格牌：平躺的「铜钱图标 + 剩余金币数」，付款时数字递减（RenderRoot2D 世界空间文字） */
    private buildPriceTag(baseS: number) {
        const tag = new Node('priceTag');
        tag.setParent(this.node);
        tag.setPosition(0.22, 0.12, baseS * 0.22);
        tag.setRotationFromEuler(-90, -49, 0); // 平躺贴地 + 补相机 yaw(-48.6°)，数字在屏幕上正向可读
        tag.setScale(0.012, 0.012, 0.012);
        tag.addComponent(RenderRoot2D);
        const lb = new Node('num');
        lb.setParent(tag);
        const l = lb.addComponent(Label);
        l.string = '';
        l.fontSize = 64; l.lineHeight = 68; l.isBold = true;
        l.color = new Color(255, 255, 255, 255);
        l.enableOutline = true;
        l.outlineColor = new Color(45, 45, 45, 255);
        l.outlineWidth = 5;
        this._priceLabel = l;
        const icon = new Node('coinIconSmall');
        icon.setParent(this.node);
        icon.setPosition(-0.42, 0.12, baseS * 0.22);
        const q = Skin.groundQuad(icon, 0.4, 0.4, 'plate_cashier', new Color(240, 200, 60), 255);
        q.setPosition(0, 0, 0);
    }

    update() {
        if (this.kind !== PlateKind.Buy || this.done) return;
        const rem = Math.max(0, this.needCoin - this.paidCoin);
        if (rem === this._lastRem) return;
        this._lastRem = rem;
        if (this._priceLabel) this._priceLabel.string = String(rem);
        // 进度：绿底从中心涨到满（付满=全绿）
        const t = this.needCoin > 0 ? Math.min(1, this.paidCoin / this.needCoin) : 0;
        if (this._baseGreen) {
            this._baseGreen.active = t > 0.01;
            this._baseGreen.setScale(Math.max(0.01, this._greenSize.x * t), Math.max(0.01, this._greenSize.z * t), 1);
        }
    }

    get radius(): number {
        if (this.radiusOverridePx > 0) return GameConfig.px(this.radiusOverridePx);
        switch (this.kind) {
            case PlateKind.Stand: return GameConfig.distStand;
            case PlateKind.Buy: return GameConfig.distStand;
            case PlateKind.Deliver: return GameConfig.distStand;
            case PlateKind.Pickup: return GameConfig.distPan;
        }
        return GameConfig.distStand;
    }

    /** 距离检测（XZ 平面） */
    contains(worldPos: Vec3): boolean {
        if (this.done || !this.node.active) return false;
        const p = this.node.worldPosition;
        const dx = p.x - worldPos.x, dz = p.z - worldPos.z;
        return dx * dx + dz * dz <= this.radius * this.radius;
    }

    setOccupied(v: boolean) {
        if (this.occupied === v) return;
        this.occupied = v;
        if (this.highlightNode) this.highlightNode.active = v;
        // 买类贴的白/绿由付款进度接管（绿=进度条），不随踩踏切换
        if (this.kind !== PlateKind.Buy) {
            if (this._baseWhite) this._baseWhite.active = !v;
            if (this._baseGreen) this._baseGreen.active = v;
        }
        // 弹性反馈
        if (v) {
            tween(this.node)
                .to(0.08, { scale: new Vec3(1.12, 1, 1.12) })
                .to(0.12, { scale: new Vec3(1, 1, 1) })
                .start();
        }
    }

    /** Buy 型收到一枚金币；返回 true 表示付满解锁 */
    receiveCoin(): boolean {
        this.paidCoin++;
        // 弹性动画
        tween(this.node)
            .to(0.04, { scale: new Vec3(1.08, 1, 1.08) })
            .to(0.06, { scale: new Vec3(1, 1, 1) })
            .start();
        if (this.paidCoin >= this.needCoin) {
            this.done = true;
            return true;
        }
        return false;
    }

    /** 完成后收起（缩小消失） */
    hide() {
        tween(this.node)
            .to(0.2, { scale: new Vec3(0.01, 0.01, 0.01) })
            .call(() => { this.node.active = false; })
            .start();
    }
}
