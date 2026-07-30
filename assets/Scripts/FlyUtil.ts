import { Node, Vec3, tween, Tween } from 'cc';

/**
 * 抛物线/弹跳飞行工具。所有位置都是目标父节点下的局部坐标。
 * 用自定义插值而不是物理，保证节奏可精确控制。
 */
export class FlyUtil {
    /** 抛物线跳到目标局部坐标，height 为弧顶抬升 */
    static jumpTo(item: Node, duration: number, to: Vec3, height: number, onEnd?: () => void): Tween<Node> {
        const from = item.position.clone();
        const target = to.clone();
        const state = { t: 0 };
        const tw = tween(state).to(duration, { t: 1 }, {
            onUpdate: () => {
                if (!item.isValid) return;
                const t = state.t;
                const x = from.x + (target.x - from.x) * t;
                const z = from.z + (target.z - from.z) * t;
                // 4h·t·(1-t) 抛物线
                const y = from.y + (target.y - from.y) * t + height * 4 * t * (1 - t);
                item.setPosition(x, y, z);
            },
        }).call(() => { onEnd && onEnd(); });
        tw.start();
        return tw;
    }

    /** 跳到目标并在落点小弹跳一次（掉肉散布用） */
    static bounceTo(item: Node, duration: number, to: Vec3, height: number, onEnd?: () => void) {
        FlyUtil.jumpTo(item, duration, to, height, () => {
            if (!item.isValid) { onEnd && onEnd(); return; }
            const p = item.position.clone();
            FlyUtil.jumpTo(item, duration * 0.5, p, height * 0.25, onEnd);
        });
    }

    /** 直线下沉（超量销毁前的收纳动画） */
    static dropTo(item: Node, duration: number, to: Vec3, onEnd?: () => void) {
        tween(item).to(duration, { position: to }).call(() => onEnd && onEnd()).start();
    }

    /** 世界坐标版跳跃：先换算成 newParent 下的局部坐标再飞 */
    static jumpToNode(item: Node, duration: number, newParent: Node, localTo: Vec3, height: number, onEnd?: () => void) {
        const wp = item.worldPosition.clone();
        item.setParent(newParent);
        item.setWorldPosition(wp);
        return FlyUtil.jumpTo(item, duration, localTo, height, onEnd);
    }
}
