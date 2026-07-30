# 砍大鱼 · 必出素材 AI 提示词（5 张）

## 出图统一要求（每张都适用）

- **纯白色背景**，不要透明底/棋盘格（AI 的"透明"多是假的；白底我这边用系统抠图管线处理，深色主体也能保住原色）
- 单主体居中，占画面 70% 以上；方图直接出 1024×1024 即可，我后期会裁到内容外接框
- 风格统一：**明亮卡通手游风、低多边形/厚涂质感、描边干净**（对齐游戏内河豚/渔夫的卡通渲染）
- 出完丢进工程根 `art_src/` 文件夹，命名 `<目标名>_src.png`（如 `logo_zh_src.png`），然后告诉 Claude「素材已就位」

---

## 1. logo_zh —— 游戏 Logo 中文版

> 卡通手游 Logo 艺术字「砍大鱼」，三个立体圆胖中文大字，暖黄色字体带深棕色描边和白色高光，字上叠一把卡通菜刀和一条蓝色河豚鱼装饰，轻微弧形排列，明亮欢快，纯白背景，手游图标品质

**English prompt:** Cartoon mobile-game logo, chunky 3D Chinese characters "砍大鱼", warm yellow letters with dark brown outline and white highlights, decorated with a cartoon cleaver and a blue pufferfish, slight arc layout, bright cheerful style, pure white background, casual game quality

⚠️ AI 写汉字极易错字——生成后逐笔检查「砍大鱼」三个字，错了就重roll或只让它出无字底板、文字后期贴。

## 2. logo_en —— 游戏 Logo 英文版

> 同上风格，文字改为「FISH CHOP!」两行排列（英文名可自定，出图前定稿），其余要求同 logo_zh

**English prompt:** Same style as above, text "FISH CHOP!" in two stacked lines, chunky cartoon letters, yellow with brown outline, cleaver and pufferfish decoration, pure white background

## 3. wound —— 鱼身伤口贴片（俯视）

> 卡通风格的一道刀砍伤口贴花，俯视视角，暗红色裂口带两三道划痕，边缘颜色渐淡，形状横向略宽（约 9:7），无阴影，纯白背景，游戏贴花素材

**English prompt:** Cartoon knife-cut wound decal, top-down view, dark red gash with 2-3 slash marks, edges fading lighter, slightly wider than tall (about 9:7), no shadow, pure white background, game decal asset

用途说明：平贴在鱼背上的受击伤痕，同屏最多 3 处，尺寸很小（约 0.2 米），细节别太碎。

## 4. blood_pool —— 地面血泊（俯视）

> 卡通风格血泊贴花，正俯视，不规则的暗红色液体渍带 2~3 个圆润分叉，中心色深边缘色浅，轮廓圆滑不狰狞，横向略宽（约 4:3），纯白背景，游戏贴花素材

**English prompt:** Cartoon blood puddle decal, straight top-down view, irregular dark red liquid stain with 2-3 rounded lobes, darker center and lighter smooth edges, rounded non-gory silhouette, about 4:3 aspect, pure white background, game decal asset

用途说明：切割机开切后铺在鱼身下的血渍，休闲游戏风——要"果酱感"不要恐怖感。

## 5. hpbar_frame —— 血条底框（长条 UI）

> 手游血条底框，白色圆角胶囊长条，边缘带极浅的灰色内描边，中间空槽，极简干净，横向长条（约 7:1，生成时画在画面正中即可），纯白背景

**English prompt:** Mobile game health bar frame, white rounded capsule bar, very light gray inner outline, empty slot in the middle, minimal and clean, wide bar about 7:1 centered in frame, pure white background

⚠️ 备注：这张是纯几何 UI，AI 容易画歪；如果 roll 两次都不满意，直接让 Claude 程序画一张更快。

---

## 不能用 AI 图解决的两项（另行安排）

- **Run_Carry.fbx 负重行走动画**：骨骼动画，需美术在现有 51 骨骨架上 K 帧，AI 出图管线覆盖不了
- **kdy_fx 特效包修复**：缺的是引擎内贴图引用（_NoiseTex/_DissovleTex），需特效同学带依赖重新导出
