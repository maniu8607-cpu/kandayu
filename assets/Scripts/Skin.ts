import { Node, Material, Texture2D, resources, MeshRenderer, SkinnedMeshRenderer, utils, primitives, Color, Vec3 } from 'cc';

/**
 * 运行时换皮工具：
 * - apply(root, texName)：给节点树下所有 MeshRenderer 套上 resources/texture/skin/<texName> 的无光材质
 * - groundQuad(...)：贴地面片（地贴/箭头用），优先加载 resources/texture/ui/<uiName>，缺图回退纯色
 * 换皮契约：同名同路径覆盖 png 即生效，代码不用改。
 */
export class Skin {
    private static _mats = new Map<string, Material>();
    private static _pending = new Map<string, ((m: Material | null) => void)[]>();

    /** 取共享材质（异步加载贴图，就绪前回调可能延迟） */
    static getMat(texName: string, cb: (m: Material | null) => void) {
        const hit = Skin._mats.get(texName);
        if (hit) { cb(hit); return; }
        const list = Skin._pending.get(texName);
        if (list) { list.push(cb); return; }
        Skin._pending.set(texName, [cb]);
        resources.load(`texture/skin/${texName}/texture`, Texture2D, (err, tex) => {
            let m: Material | null = null;
            if (!err && tex) {
                m = new Material();
                m.initialize({ effectName: 'builtin-unlit', defines: { USE_TEXTURE: true } });
                m.setProperty('mainTexture', tex);
                Skin._mats.set(texName, m);
            }
            const cbs = Skin._pending.get(texName) || [];
            Skin._pending.delete(texName);
            cbs.forEach(f => f(m));
        });
    }

    /** 取带颜色叠乘的皮材质（受击变红等用），按 texName+tag 缓存 */
    static getTintMat(texName: string, tag: string, color: Color, cb: (m: Material | null) => void) {
        const key = `${texName}#${tag}`;
        const hit = Skin._mats.get(key);
        if (hit) { cb(hit); return; }
        resources.load(`texture/skin/${texName}/texture`, Texture2D, (err, tex) => {
            if (err || !tex) { cb(null); return; }
            const m = new Material();
            m.initialize({ effectName: 'builtin-unlit', defines: { USE_TEXTURE: true } });
            m.setProperty('mainTexture', tex);
            m.setProperty('mainColor', color);
            Skin._mats.set(key, m);
            cb(m);
        });
    }

    /** 给节点树全部网格套皮 */
    static apply(root: Node, texName: string) {
        Skin.getMat(texName, m => {
            if (!m || !root.isValid) return;
            const rs = root.getComponentsInChildren(MeshRenderer);
            for (const r of rs) {
                // 面片（光环/气泡/血条/伤口，都以 quad_ 命名）各管各的贴图，
                // 套进去会变成一整张图集平铺在地上
                if (r.node.name.startsWith('quad_')) continue;
                for (let i = 0; i < r.sharedMaterials.length; i++) r.setSharedMaterial(m, i);
            }
        });
    }

    /** 建一块贴地面片（XZ 平面）。优先用 resources/texture/ui/<uiName>，缺图回退 fallback 色块 */
    static groundQuad(parent: Node, sizeX: number, sizeZ: number, uiName: string, fallback: Color, alpha = 200): Node {
        const n = new Node('quad_' + uiName);
        n.setParent(parent);
        const mr = n.addComponent(MeshRenderer);
        mr.mesh = utils.MeshUtils.createMesh(primitives.quad());
        n.setRotationFromEuler(-90, 0, 0);      // quad 默认立在 XY，放倒贴地
        n.setScale(sizeX, sizeZ, 1);
        n.setPosition(0, 0.03, 0);              // 微抬避免 z-fighting
        const useColor = (c: Color) => {
            const m = new Material();
            // technique 1 = unlit 的 transparent 通道，自带 SRC_ALPHA 混合。
            // 手拼 blendState 只写 blend:true 不设混合因子的话 alpha 会被整个忽略，
            // PNG 的透明区直接画成底色（通常是黑）——全部面片显示成黑方块。
            m.initialize({ effectName: 'builtin-unlit', technique: 1 });
            m.setProperty('mainColor', c);
            mr.setSharedMaterial(m, 0);
        };
        resources.load(`texture/ui/${uiName}/texture`, Texture2D, (err, tex) => {
            if (!n.isValid) return;
            if (err || !tex) { const c = fallback.clone(); c.a = alpha; useColor(c); return; }
            const m = new Material();
            m.initialize({ effectName: 'builtin-unlit', technique: 1, defines: { USE_TEXTURE: true } });
            m.setProperty('mainTexture', tex);
            mr.setSharedMaterial(m, 0);
        });
        return n;
    }

    /** 换掉已建面片的贴图（气泡切 x2/x1/x0 用） */
    static setQuadTexture(quad: Node, tex: Texture2D) {
        const mr = quad.getComponent(MeshRenderer);
        if (!mr) return;
        const m = new Material();
        m.initialize({ effectName: 'builtin-unlit', technique: 1, defines: { USE_TEXTURE: true } });
        m.setProperty('mainTexture', tex);
        mr.setSharedMaterial(m, 0);
    }

    /** 竖立告示片（大箭头等），面向相机方向由外部旋转 */
    static uprightQuad(parent: Node, w: number, h: number, uiName: string, fallback: Color): Node {
        const n = Skin.groundQuad(parent, w, h, uiName, fallback, 255);
        n.setRotationFromEuler(0, 0, 0);
        n.setPosition(0, 0, 0);
        return n;
    }
}
