import { _decorator, Component, Node, Vec3, Prefab, instantiate, tween, ParticleSystem, MeshRenderer, Material, Color, utils, primitives } from 'cc';
import { GameConfig } from './GameConfig';
import { FlyUtil } from './FlyUtil';
import { Skin } from './Skin';
import { AudioMgr } from './AudioMgr';
const { ccclass, property } = _decorator;

/**
 * 加工线：烤炉（前桌生肉 → 炉膛烤制 → 后桌熟肉）+ 可选传送带自动上料。
 * 前桌/炉膛/后桌都是堆叠挂点空节点，位置在编辑器拖。
 * 烤制无固定产能上限：盘中有肉即烤。
 */
@ccclass('ProcessLine')
export class ProcessLine extends Component {
    @property({ type: Node, tooltip: '烤炉前桌堆叠点（生肉排队）' })
    frontPan: Node = null!;
    @property({ type: Node, tooltip: '炉膛点（一次一块）' })
    ovenSlot: Node = null!;
    @property({ type: Node, tooltip: '烤炉后桌堆叠点（熟肉）' })
    backPan: Node = null!;
    @property({ type: Node, tooltip: '贩卖窗口堆叠点（熟肉待售）' })
    sellPan: Node = null!;
    @property({ type: Prefab, tooltip: '熟肉预制体（烤完替换生肉）' })
    cookedPrefab: Prefab = null!;
    @property({ type: Node, tooltip: '烤烟粒子节点（可空）' })
    smokeNode: Node = null!;
    @property({ tooltip: '烤制时长(s)' })
    cookTime = 1.2;
    @property({ tooltip: '传送带起点（可空，解锁后用）' })
    beltStart: Node = null!;
    @property({ type: Node, tooltip: '传送带终点（可空）' })
    beltEnd: Node = null!;

    private _cooking = false;

    get frontCount() { return this.frontPan.children.length; }
    get backCount() { return this.backPan.children.length; }
    get sellCount() { return this.sellPan.children.length; }

    /** 收一块生肉进前桌（世界坐标起飞） */
    receiveRaw(item: Node, onEnd?: () => void) {
        const idx = this.frontCount;
        const localTo = new Vec3(0, idx * GameConfig.stackPan, 0);
        FlyUtil.jumpToNode(item, 0.1, this.frontPan, localTo, GameConfig.px(GameConfig.JUMP_H_DELIVER_PX), () => {
            if (idx >= 120) item.destroy(); // 溢出保护
            onEnd && onEnd();
        });
    }

    private _smokeOn = false;

    update() {
        // 有肉即烤，一次一块
        if (!this._cooking && this.frontCount > 0) this.cookOne();
        if (this.smokeNode) {
            this.smokeNode.active = this._cooking;
            if (this._cooking && !this._smokeOn) {
                // kdy 粒子非自动播,激活时踢一下
                this.smokeNode.getComponentsInChildren(ParticleSystem).forEach(ps => { try { ps.stop(); ps.play(); } catch (e) { } });
            }
            this._smokeOn = this._cooking;
        }
    }

    @property({ tooltip: '烤炉一次进炉几块（用户拍板：一次一片）' })
    cookBatch = 1;

    private cookOne() {
        const n = Math.min(this.cookBatch, this.frontCount);
        if (n <= 0) return;
        this._cooking = true;
        AudioMgr.play('oven', 0.8, 300);
        const items: Node[] = [];
        for (let i = 0; i < n; i++) items.push(this.frontPan.children[this.frontCount - 1 - i]);
        let landed = 0;
        items.forEach((item, k) => {
            // 并排摆进炉膛
            FlyUtil.jumpToNode(item, 0.15, this.ovenSlot, new Vec3((k - (n - 1) / 2) * 0.4, 0, 0), GameConfig.px(100), () => {
                landed++;
                if (landed < items.length) return;
                // 全部进炉后一起烤：颜色渐变演出交给模型/材质，这里用缩放脉冲代替占位
                tween(this.ovenSlot)
                    .to(this.cookTime * 0.5, { scale: new Vec3(1.05, 1.05, 1.05) })
                    .to(this.cookTime * 0.5, { scale: new Vec3(1, 1, 1) })
                    .call(() => {
                        items.forEach(it => {
                            if (!it.isValid) return;
                            // 替换成熟肉
                            let cooked: Node = it;
                            if (this.cookedPrefab) {
                                cooked = instantiate(this.cookedPrefab);
                                cooked.setParent(this.ovenSlot);
                                cooked.setWorldPosition(it.worldPosition);
                                Skin.apply(cooked, 'T_yu_BC');
                                it.destroy();
                            }
                            // 竞品出餐感：熟肉垫白盘，两摞沿桌子长边高高叠起
                            const idx = this.backCount;
                            const col = idx % 2, row = Math.floor(idx / 2);
                            const localTo = new Vec3(0, row * 0.3, (col - 0.5) * 1.2);
                            const dish = new Node('quad_dish'); // quad_ 前缀避开 Skin 套皮
                            dish.setParent(cooked);
                            // 缩放来自整条父链(ovenSlot/backPan)，必须用世界缩放补偿，盘子才是恒定世界尺寸
                            const ws = Math.max(0.01, cooked.worldScale.x);
                            dish.setScale(1 / ws, 1 / ws, 1 / ws);
                            dish.setPosition(0, -0.14 / ws, 0);
                            const dmr = dish.addComponent(MeshRenderer);
                            // cylinder 第三参是 opts 对象——直接传数字会被忽略、高度用默认 2，
                            // 盘子会变成两米高的白柱；盘径要比肉排裙边大一圈白边才露得出来
                            dmr.mesh = utils.MeshUtils.createMesh(primitives.cylinder(0.88, 0.88, { height: 0.07 }));
                            const dmat = new Material();
                            dmat.initialize({ effectName: 'builtin-unlit' });
                            dmat.setProperty('mainColor', new Color(246, 246, 242, 255));
                            dmr.setSharedMaterial(dmat, 0);
                            FlyUtil.jumpToNode(cooked, 0.15, this.backPan, localTo, GameConfig.px(100), () => {
                                if (idx >= GameConfig.PAN_MAX) cooked.destroy();
                            });
                        });
                        this._cooking = false;
                    })
                    .start();
            });
        });
    }

    /** 从后桌搬一块熟肉到贩卖窗口，无肉返回 false */
    moveBackToSell(): boolean {
        const n = this.backCount;
        if (n <= 0) return false;
        const item = this.backPan.children[n - 1];
        const idx = this.sellCount;
        const col = idx % 2, row = Math.floor(idx / 2);
        const gap = GameConfig.px(30);
        const localTo = new Vec3((col - 0.5) * gap, row * GameConfig.stackPan, 0);
        FlyUtil.jumpToNode(item, 0.1, this.sellPan, localTo, GameConfig.px(GameConfig.JUMP_H_DELIVER_PX), () => {
            if (idx >= GameConfig.PAN_MAX) item.destroy();
        });
        return true;
    }

    /** 帮手：后桌拿起一块（不落盘，由帮手携带走过去） */
    takeBackItem(): Node | null {
        const n = this.backCount;
        return n > 0 ? this.backPan.children[n - 1] : null;
    }

    /** 帮手：把手里那块放到售卖盘 */
    putSellItem(item: Node) {
        const idx = this.sellCount;
        const col = idx % 2, row = Math.floor(idx / 2);
        const gap = GameConfig.px(30);
        const localTo = new Vec3((col - 0.5) * gap, row * GameConfig.stackPan, 0);
        FlyUtil.jumpToNode(item, 0.15, this.sellPan, localTo, GameConfig.px(GameConfig.JUMP_H_DELIVER_PX), () => {
            if (idx >= GameConfig.PAN_MAX) item.destroy();
        });
    }

    /** 取一块待售熟肉（卖给顾客），无肉返回 null */
    takeSell(): Node | null {
        const n = this.sellCount;
        return n > 0 ? this.sellPan.children[n - 1] : null;
    }

    /** 传送带：把一块生肉从带头运到带尾再入前桌（解锁传送带后自动链路用） */
    beltCarry(item: Node, onEnd?: () => void) {
        if (!this.beltStart || !this.beltEnd) { this.receiveRaw(item, onEnd); return; }
        const wp = item.worldPosition.clone();
        item.setParent(this.node);
        item.setWorldPosition(wp);
        AudioMgr.play('belt', 0.7, 300);
        tween(item)
            .to(0.1, { worldPosition: this.beltStart.worldPosition })
            .to(0.6, { worldPosition: this.beltEnd.worldPosition })
            .call(() => this.receiveRaw(item, onEnd))
            .start();
    }
}
