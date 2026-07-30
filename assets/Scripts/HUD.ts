import { _decorator, Component, Node, Label, Sprite, SpriteFrame, Texture2D, resources, Graphics, UITransform, Widget, Color, tween, Vec3, UIOpacity, input, Input } from 'cc';
import { Lang } from './Lang';
const { ccclass, property } = _decorator;

/**
 * HUD：金币计数(右上) / 拖动提示(下中) / 结算页(全屏)。
 * 骨架节点在编辑器摆位，视觉在运行时填充：
 * 优先读 resources/texture/ui/{coin_icon|tip_drag|logo|playnow}，缺图回退代码绘制。
 */
@ccclass('HUD')
export class HUD extends Component {
    @property({ type: Node, tooltip: '金币计数容器（自带 Label）' }) coinCounter: Node = null!;
    @property({ type: Node, tooltip: '拖动提示容器' }) dragTip: Node = null!;
    @property({ type: Node, tooltip: '结算页容器（初始隐藏）' }) endCard: Node = null!;

    private _tipTime = 0;
    private _brand: Node | null = null;
    private static readonly UI_LAYER = 1 << 25; // UI_2D

    onLoad() {
        this.buildCoin();
        this.buildTip();
        this.buildBrand();
        this.buildEnd();
        this.markLayer(this.node);
    }

    /** 运行时创建的节点默认在 DEFAULT 层,UI 相机看不见——统一递归打 UI_2D */
    private markLayer(n: Node) {
        n.layer = HUD.UI_LAYER;
        n.children.forEach(c => this.markLayer(c));
    }

    /** 尝试给 Sprite 节点加载 ui 贴图，失败走 fallback 绘制 */
    private loadUiSprite(n: Node, name: string, w: number, h: number, fallback: (g: Graphics) => void, localized = false) {
        const path = localized ? Lang.uiPath(name) : `texture/ui/${name}`;
        resources.load(`${path}/texture`, Texture2D, (err, tex) => {
            if (!n.isValid) return;
            if (!err && tex) {
                const sp = n.getComponent(Sprite) ?? n.addComponent(Sprite);
                const sf = new SpriteFrame();
                sf.texture = tex;
                sp.spriteFrame = sf;
                sp.sizeMode = Sprite.SizeMode.CUSTOM;
                // 按目标高度等比缩放,避免拉扁
                const k = Math.min(w / tex.width, h / tex.height);
                n.getComponent(UITransform)!.setContentSize(tex.width * k, tex.height * k);
            } else {
                const g = n.getComponent(Graphics) ?? n.addComponent(Graphics);
                fallback(g);
            }
            this.markLayer(n); // 回调里可能新建了子节点,补打层
        });
    }

    private buildCoin() {
        if (!this.coinCounter) return;
        // 货币栏底图（美术图 161×61,放大到 242×92）
        const bg = new Node('bg');
        bg.setParent(this.coinCounter);
        bg.setSiblingIndex(0);
        bg.addComponent(UITransform).setContentSize(200, 76);
        this.loadUiSprite(bg, 'coin_bar', 200, 76, g => {
            g.fillColor = new Color(0, 0, 0, 140);
            g.roundRect(-100, -38, 200, 76, 34);
            g.fill();
        });
        // 数字靠右排，位置对齐货币栏右侧数字槽
        const lb = this.coinCounter.getComponent(Label);
        if (lb) {
            lb.horizontalAlign = Label.HorizontalAlign.CENTER;
            this.coinCounter.getComponent(UITransform)!.setContentSize(200, 76);
        }
        const numHolder = this.coinCounter.getChildByName('num');
        if (!numHolder && lb) {
            // 数字整体右移到栏内数字区
            lb.node.setPosition(lb.node.position.x + 40, lb.node.position.y, 0);
        }
    }

    private buildTip() {
        if (!this.dragTip) return;
        // 提示盘别做太大：占屏 1/3 宽会遮挡玩法区
        this.dragTip.setScale(0.62, 0.62, 1);
        // 摇杆三件套（美术图）：底盘 175 / 圈 146 / 手柄 86
        const pad = new Node('pad');
        pad.setParent(this.dragTip);
        pad.addComponent(UITransform).setContentSize(170, 170);
        this.loadUiSprite(pad, 'stick_base', 170, 170, g => {
            g.fillColor = new Color(255, 255, 255, 60);
            g.circle(0, 0, 75); g.fill();
        });
        const ring = new Node('ring');
        ring.setParent(this.dragTip);
        ring.addComponent(UITransform).setContentSize(142, 142);
        this.loadUiSprite(ring, 'stick_ring', 142, 142, g => {
            g.lineWidth = 4; g.strokeColor = new Color(255, 255, 255, 150);
            g.circle(0, 0, 70); g.stroke();
        });
        const knob = new Node('knob');
        knob.setParent(this.dragTip);
        knob.addComponent(UITransform).setContentSize(84, 84);
        this.loadUiSprite(knob, 'stick_knob', 84, 84, kg => {
            kg.fillColor = new Color(255, 255, 255, 220);
            kg.circle(0, 0, 30); kg.fill();
        });
        // 手柄循环画圈演示
        const R = 34;
        const state = { t: 0 };
        tween(state).by(2, { t: 1 }, {
            onUpdate: () => {
                if (!knob.isValid || !this.dragTip.activeInHierarchy) return;
                const a = state.t * Math.PI * 2;
                knob.setPosition(Math.cos(a) * R, Math.sin(a) * R * 0.6 - 6);
            },
        }).repeatForever().start();
        const txt = new Node('txt');
        txt.setParent(this.dragTip);
        txt.setPosition(0, -118);
        txt.addComponent(UITransform).setContentSize(300, 74);
        this.loadUiSprite(txt, 'tip_drag', 300, 74, () => {
            const lb = txt.addComponent(Label);
            lb.string = '拖动移动';
            lb.fontSize = 42; lb.lineHeight = 48; lb.isBold = true;
            lb.color = new Color(255, 255, 255, 255);
            lb.enableOutline = true;
            lb.outlineColor = new Color(60, 40, 10, 255);
            lb.outlineWidth = 4;
        }, true);
    }

    /** 结算页弹出时收起游戏内 HUD（Game 调用 endCard.active=true 后由本方法同步）。
     *  待机重现拖动提示由 Game.updateIdleTip 负责（IDLE_TIP_TIME），本组件不重复做。 */
    update() {
        if (!this.endCard) return;
        const on = this.endCard.activeInHierarchy;
        if (on) {
            if (this.dragTip && this.dragTip.active) this.dragTip.active = false;
            if (this.coinCounter && this.coinCounter.active) this.coinCounter.active = false;
            // 结算页自带大 logo+按钮，角落小份收起免得重影
            if (this._brand && this._brand.active) this._brand.active = false;
        }
    }

    /** 左上角常驻 logo + Play now（竞品全程挂着，随时可点跳店） */
    private buildBrand() {
        const brand = new Node('brand');
        brand.setParent(this.node);
        brand.addComponent(UITransform).setContentSize(10, 10);
        const w = brand.addComponent(Widget);
        w.isAlignTop = true; w.isAlignLeft = true;
        w.top = 24; w.left = 20;
        w.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
        const logo = new Node('logo');
        logo.setParent(brand);
        logo.setPosition(120, -78);
        logo.addComponent(UITransform).setContentSize(240, 160);
        this.loadUiSprite(logo, 'logo', 240, 160, () => {
            const t = new Node('t');
            t.setParent(logo);
            const lb = t.addComponent(Label);
            lb.string = '砍大鱼';
            lb.fontSize = 56; lb.lineHeight = 60; lb.isBold = true;
            lb.color = new Color(255, 230, 120, 255);
            lb.enableOutline = true;
            lb.outlineColor = new Color(120, 60, 10, 255);
            lb.outlineWidth = 4;
        }, true);
        const btn = new Node('playnow');
        btn.setParent(brand);
        btn.setPosition(105, -196);
        btn.addComponent(UITransform).setContentSize(200, 64);
        this.loadUiSprite(btn, 'playnow', 200, 64, gg => {
            gg.fillColor = new Color(255, 170, 30, 255);
            gg.roundRect(-95, -30, 190, 60, 16);
            gg.fill();
            const t = new Node('t');
            t.setParent(btn);
            const lb = t.addComponent(Label);
            lb.string = 'PLAY NOW';
            lb.fontSize = 30; lb.lineHeight = 34; lb.isBold = true;
            lb.color = new Color(255, 255, 255, 255);
        }, true);
        tween(btn)
            .to(0.5, { scale: new Vec3(1.1, 1.1, 1) })
            .to(0.5, { scale: new Vec3(1, 1, 1) })
            .union()
            .repeatForever()
            .start();
        const jump = () => { console.log('[sdk] jump store'); };
        btn.on(Input.EventType.TOUCH_END, jump);
        btn.on(Input.EventType.MOUSE_UP, jump);
        this._brand = brand;
    }

    private buildEnd() {
        if (!this.endCard) return;
        // 全屏半透黑底（用超尺寸矩形覆盖各种分辨率）
        const mask = new Node('mask');
        mask.setParent(this.endCard);
        mask.addComponent(UITransform).setContentSize(3000, 3000);
        const g = mask.addComponent(Graphics);
        g.fillColor = new Color(0, 0, 0, 170);
        g.rect(-1500, -1500, 3000, 3000);
        g.fill();
        // logo（缺图回退标题字）
        const logo = new Node('logo');
        logo.setParent(this.endCard);
        logo.setPosition(0, 300);
        logo.addComponent(UITransform).setContentSize(500, 340);
        this.loadUiSprite(logo, 'logo', 500, 340, () => {
            const t = new Node('t');
            t.setParent(logo);
            const lb = t.addComponent(Label);
            lb.string = '砍大鱼';
            lb.fontSize = 96;
            lb.lineHeight = 100;
            lb.isBold = true;
            lb.color = new Color(255, 230, 120, 255);
            lb.enableOutline = true;
            lb.outlineColor = new Color(120, 60, 10, 255);
            lb.outlineWidth = 6;
        }, true);
        // PLAY NOW 按钮（1s 脉冲）
        const btn = new Node('playnow');
        btn.setParent(this.endCard);
        btn.setPosition(0, -80);
        btn.addComponent(UITransform).setContentSize(460, 142);
        this.loadUiSprite(btn, 'playnow', 460, 142, gg => {
            gg.fillColor = new Color(255, 170, 30, 255);
            gg.roundRect(-180, -60, 360, 120, 28);
            gg.fill();
            const t = new Node('t');
            t.setParent(btn);
            const lb = t.addComponent(Label);
            lb.string = 'PLAY NOW';
            lb.fontSize = 52;
            lb.lineHeight = 56;
            lb.isBold = true;
            lb.color = new Color(255, 255, 255, 255);
        }, true);
        tween(btn)
            .to(0.5, { scale: new Vec3(1.12, 1.12, 1) })
            .to(0.5, { scale: new Vec3(1, 1, 1) })
            .union()
            .repeatForever()
            .start();
        // 点任意处跳商店（触摸+鼠标双注册）
        const jump = () => { console.log('[sdk] jump store'); };
        this.endCard.on(Input.EventType.TOUCH_END, jump);
        this.endCard.on(Input.EventType.MOUSE_UP, jump);
    }
}
