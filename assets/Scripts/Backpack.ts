import { _decorator, Component, Node, Vec3 } from 'cc';
import { GameConfig } from './GameConfig';
import { FlyUtil } from './FlyUtil';
const { ccclass, property } = _decorator;

export enum CarryType { None = 0, Wood = 1, RawMeat = 2, CookedMeat = 3 }

/**
 * 角色背篓：木头/生肉/熟肉往背后堆叠，金币单独一摞。
 * 堆叠挂点用子节点（bagPoint/coinPoint）在编辑器里拖位置。
 */
@ccclass('Backpack')
export class Backpack extends Component {
    @property({ type: Node, tooltip: '木头/生肉堆叠挂点（背后）' })
    bagPoint: Node = null!;
    @property({ type: Node, tooltip: '熟肉堆叠挂点（与生肉分栈，参考同款可同时背）' })
    cookedPoint: Node = null!;
    @property({ type: Node, tooltip: '金币堆叠挂点' })
    coinPoint: Node = null!;

    carryType: CarryType = CarryType.None;

    get itemCount() { return this.bagPoint ? this.bagPoint.children.length : 0; }
    get cookedCount() { return this.cookedPoint ? this.cookedPoint.children.length : 0; }
    get coinCount() { return this.coinPoint ? this.coinPoint.children.length : 0; }
    get isFull() { return this.itemCount >= GameConfig.BAG_MEAT_MAX; }
    get isCookedFull() { return this.cookedCount >= GameConfig.BAG_MEAT_MAX; }

    /** 收入一件物品（世界坐标起飞，抛物线落进堆叠位）。熟肉走独立栈 */
    putItem(item: Node, type: CarryType, jumpHeightPx = GameConfig.JUMP_H_PICKUP_PX, onEnd?: () => void): boolean {
        if (type === CarryType.CookedMeat) {
            if (!this.cookedPoint || this.isCookedFull) return false;
            FlyUtil.jumpToNode(item, 0.25, this.cookedPoint, Backpack.bundleSlot(this.cookedCount), GameConfig.px(jumpHeightPx), onEnd);
            return true;
        }
        if (this.itemCount >= GameConfig.BAG_MEAT_MAX) return false;
        if (this.carryType !== CarryType.None && this.carryType !== type && this.itemCount > 0) return false;
        this.carryType = type;
        FlyUtil.jumpToNode(item, 0.25, this.bagPoint, Backpack.bundleSlot(this.itemCount), GameConfig.px(jumpHeightPx), onEnd);
        return true;
    }

    /** 背包堆叠：竞品是单列一摞（0, 6px*n）。层高在这调 */
    private static bundleSlot(idx: number): Vec3 {
        return new Vec3(0, idx * 0.09, 0);
    }

    /** 取出木头/生肉栈顶（返回 null 表示空） */
    takeItem(): Node | null {
        const n = this.itemCount;
        if (n <= 0) { this.carryType = CarryType.None; return null; }
        const item = this.bagPoint.children[n - 1];
        if (n === 1) this.carryType = CarryType.None;
        return item;
    }

    /** 取出熟肉栈顶 */
    takeCooked(): Node | null {
        const n = this.cookedCount;
        return n > 0 ? this.cookedPoint.children[n - 1] : null;
    }

    putCoin(coin: Node, onEnd?: () => void) {
        const idx = this.coinCount;
        // 竞品金币堆叠也是单列 (0, 10px*n)
        const localTo = new Vec3(0, idx * 0.12, 0);
        FlyUtil.jumpToNode(coin, 0.1, this.coinPoint, localTo, GameConfig.px(GameConfig.JUMP_H_DELIVER_PX), () => {
            // 超出上限只保留数值表现，销毁模型
            if (idx >= GameConfig.BAG_COIN_MAX) coin.destroy();
            onEnd && onEnd();
        });
    }

    takeCoin(): Node | null {
        const n = this.coinCount;
        return n > 0 ? this.coinPoint.children[n - 1] : null;
    }
}
