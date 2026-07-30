/**
 * 语言选择：决定 resources/texture/ui/<lang>/ 取哪套图（logo / playnow / tip_drag）。
 * 六语：zh 简体 / zh-tw 繁体 / en 英文 / ja 日语 / ko 韩语 / vi 越南语。
 * 默认按浏览器语言判定，可用 Lang.force 覆盖（投放时按渠道写死）。
 */
export class Lang {
    static readonly SUPPORTED = ['zh', 'zh-tw', 'en', 'ja', 'ko', 'vi'];
    /** 非空则强制使用该语言（Game 的 Inspector 旋钮写入） */
    static force = '';

    private static _cur = '';

    static get current(): string {
        if (Lang.force && Lang.SUPPORTED.includes(Lang.force)) return Lang.force;
        if (Lang._cur) return Lang._cur;
        let l = 'en';
        try {
            const nav = (globalThis as any).navigator;
            const raw = ((nav && (nav.language || nav.userLanguage)) || 'en').toLowerCase();
            if (raw.startsWith('zh')) l = (raw.includes('tw') || raw.includes('hk') || raw.includes('hant')) ? 'zh-tw' : 'zh';
            else if (raw.startsWith('ja')) l = 'ja';
            else if (raw.startsWith('ko')) l = 'ko';
            else if (raw.startsWith('vi')) l = 'vi';
            else l = 'en';
        } catch (e) { l = 'en'; }
        Lang._cur = l;
        return l;
    }

    /** 语言相关图的 resources 路径（不含 /texture 后缀） */
    static uiPath(name: string): string {
        return `texture/ui/${Lang.current}/${name}`;
    }
}
