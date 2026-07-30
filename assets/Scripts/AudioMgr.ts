import { Node, AudioSource, AudioClip, resources, director } from 'cc';

/**
 * 轻量音频管理：resources/audio/<key>.mp3 懒加载。
 * - play(key)：单发音效（同 key 节流,默认 60ms,防拾取连发刷爆）
 * - playLoop(key)：循环轨（bgm/环境音,每 key 一条,重复调用不叠加）
 * - stopLoop(key) / stopAll()
 * 首次用户交互前浏览器禁播,失败静默(引擎恢复后自然可播)。
 */
export class AudioMgr {
    private static _node: Node | null = null;
    private static _oneShot: AudioSource | null = null;
    private static _loops = new Map<string, AudioSource>();
    private static _clips = new Map<string, AudioClip>();
    private static _loading = new Set<string>();
    private static _lastPlay = new Map<string, number>();

    private static ensure() {
        if (this._node && this._node.isValid) return;
        const n = new Node('__AudioMgr');
        director.getScene()!.addChild(n);
        director.addPersistRootNode(n);
        this._node = n;
        this._oneShot = n.addComponent(AudioSource);
    }

    private static load(key: string, cb: (clip: AudioClip | null) => void) {
        const hit = this._clips.get(key);
        if (hit) { cb(hit); return; }
        if (this._loading.has(key)) { cb(null); return; } // 加载中先丢弃本次
        this._loading.add(key);
        resources.load(`audio/${key}`, AudioClip, (err, clip) => {
            this._loading.delete(key);
            if (!err && clip) this._clips.set(key, clip);
            cb(err ? null : clip);
        });
    }

    /** 单发。throttleMs 内同 key 只响一次 */
    static play(key: string, volume = 1, throttleMs = 60) {
        this.ensure();
        const now = performance.now();
        const last = this._lastPlay.get(key) ?? -1e9;
        if (now - last < throttleMs) return;
        this._lastPlay.set(key, now);
        this.load(key, clip => {
            if (!clip || !this._oneShot) return;
            try { this._oneShot.playOneShot(clip, volume); } catch (e) { /* 交互前禁播,忽略 */ }
        });
    }

    /** 循环轨（bgm/环境）。重复调用同 key 不会叠加 */
    static playLoop(key: string, volume = 1) {
        this.ensure();
        const exist = this._loops.get(key);
        if (exist && exist.isValid) { if (!exist.playing) { try { exist.play(); } catch (e) {} } return; }
        const src = this._node!.addComponent(AudioSource);
        src.loop = true;
        src.volume = volume;
        this._loops.set(key, src);
        this.load(key, clip => {
            if (!clip) return;
            src.clip = clip;
            try { src.play(); } catch (e) { /* 交互前禁播 */ }
        });
    }

    static stopLoop(key: string) {
        const src = this._loops.get(key);
        if (src && src.isValid) src.stop();
    }

    static stopAll() {
        this._loops.forEach(s => { if (s.isValid) s.stop(); });
        if (this._oneShot && this._oneShot.isValid) this._oneShot.stop();
    }
}
