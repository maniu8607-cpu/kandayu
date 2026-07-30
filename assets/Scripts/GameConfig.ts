/**
 * 全局数值配置（参考包实测值，单位说明见注释）
 * 参考坐标系是 720×1280 像素；本工程是 3D 世界（米）。
 * 所有"像素口径"的数值统一除以 PX_PER_METER 换算，只在这一处定义换算率。
 */
export class GameConfig {
    /** 像素→世界单位换算率（用地图上两台烤肉台间距标定，见 复现规格_总纲.md） */
    static PX_PER_METER = 40;

    // —— 移动 ——
    static PLAYER_SPEED_PX = 400;      // 主角移速 px/s
    static FISH_SPEED_PX = 210;        // 大鱼游速 px/s（运行表现值）
    static CROC_SPEED_PX = 50;         // 终局鳄鱼游速 px/s

    // —— 战斗/砍鱼 ——
    static FISH_HP = 600;
    static HIT_DAMAGE = 10;            // 每刀伤害（60 刀砍死）
    static ATTACK_INTERVAL = 0.35;     // 秒/刀
    static ATTACK_RANGE_PX = 100;      // 砍鱼判定距离
    static PICKUP_FACTOR = 0.75;       // 拾肉判定 = ATTACK_RANGE * 0.75
    static CUTTER_DAMAGE = 10;         // 切割机每次伤害（参考=10/循环,出肉靠 3块/次）
    static HELPER_WORK_INTERVAL = 0.5; // 帮手搬运节奏 s/件
    static BELT_FEED_INTERVAL = 0.8;   // 传送带自动上料间隔 s/件

    // —— 触发距离（px）——
    static DIST_STAND_PX = 60;         // 站立地贴
    static DIST_PAN_PX = 100;          // 盘子/收银台
    static DIST_OVEN_PX = 170;         // 烤炉盘

    // —— 节奏 ——
    static DELIVER_INTERVAL = 0.025;   // 交付连发 s/件
    static DELIVER_INTERVAL_SLOW = 0.06;// 交付地贴节奏 s/件
    static COIN_FLY_INTERVAL = 0.03;   // 金币连发 s/枚
    static CONVEYOR_FEED_INTERVAL = 0.8;// 肉上传送带间隔

    // —— 经济 ——
    static COIN_PER_MEAT = 2;          // 每份熟肉产币
    static BUY_COUNT = 2;              // 每顾客购买份数
    static UNLOCK_COSTS = [20, 20, 40, 50, 50, 50, 50, 100, 100, 100, 100, 100, 100, 100];
    static HELPER_UP_COST = 20;

    // —— 容量 ——
    static BAG_MEAT_MAX = 50;
    static BAG_COIN_MAX = 30;
    static PAN_MAX = 80;
    static GROUND_MEAT_MAX = 50;

    // —— 掉落散布（px）——
    static DROP_SCOPE_MIN_PX = 100;
    static DROP_SCOPE_MAX_PX = 150;

    // —— 堆叠间距（px）——
    static STACK_MEAT_PX = 6;
    static STACK_COIN_PX = 10;
    static STACK_PAN_PX = 7;

    // —— 抛物线（px）——
    static JUMP_H_DELIVER_PX = 100;
    static JUMP_H_PICKUP_PX = 300;

    // —— 相机/演出 ——
    static CAMERA_SMOOTH = 0.1;        // 跟随 lerp 系数
    static CAMERA_OFFSET_Y_PX = 150;   // 跟随点在主角前方的偏移（参考里是屏幕上方150px）
    static EXPAND_CAMERA_TWEEN = 0.5;  // 扩建拉远时长
    static END_CAMERA_TWEEN = 1.5;     // 终局镜头移动时长
    static WIN_DELAY = 2;              // 鳄鱼展示后判胜
    static JUMP_STORE_DELAY = 0.7;     // 判胜后跳商店
    static IDLE_TIP_TIME = 5;          // 无操作重弹引导

    // —— 生成 ——
    static FISH_RESPAWN_DIST_PX = 680; // 最后一条鱼离出生点超过该值补鱼
    static CUSTOMER_SPAWN_DIST_PX = 92;// 顾客补位阈值

    // —— 换算工具 ——
    static px(v: number): number { return v / GameConfig.PX_PER_METER; }
    static get playerSpeed() { return GameConfig.px(GameConfig.PLAYER_SPEED_PX); }
    static get fishSpeed() { return GameConfig.px(GameConfig.FISH_SPEED_PX); }
    static get attackRange() { return GameConfig.px(GameConfig.ATTACK_RANGE_PX); }
    static get distStand() { return GameConfig.px(GameConfig.DIST_STAND_PX); }
    static get distPan() { return GameConfig.px(GameConfig.DIST_PAN_PX); }
    static get distOven() { return GameConfig.px(GameConfig.DIST_OVEN_PX); }
    static get stackMeat() { return GameConfig.px(GameConfig.STACK_MEAT_PX); }
    static get stackCoin() { return GameConfig.px(GameConfig.STACK_COIN_PX); }
    static get stackPan() { return GameConfig.px(GameConfig.STACK_PAN_PX); }
}
