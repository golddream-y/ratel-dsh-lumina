# React Bits 组件库调研与目录清单

> ⚠️ **内部研究产物，不得随插件源码或发布物分发。**
> 本文件记录了第三方组件的实现技术分析。commons clause 明确禁止再分发组件本身**"包括移植版"**，
> 因此本文件只用于内部需求确认，**不进入 `dsh-lumina` 的 npm 包、仓库或任何对外产物**。
> 实现规则见 [05 §5.4](05-reactbits对照与许可.md)。

> 调研对象：<https://reactbits.dev/>（免费站）与 <https://pro.reactbits.dev/docs/components>（Pro 站）
> 调研时间：2026-10-21　方法：抓取两站组件索引页、逐组件页面与 shadcn registry 源码（免费站 217 个组件全部拉取源码并解析 import），Pro 站源码需付费，仅能读取公开的页面描述、Props 与预览。

---

## 0. 结论速览

| 问题 | 结论 |
| --- | --- |
| 是不是一个库？ | **是两条产品线**：免费站 `reactbits.dev`（217 个组件，开源 MIT + Commons Clause），Pro 站 `pro.reactbits.dev`（230 个组件 + 300 blocks + 300 App UI + 15 模板 + Agent Kit，付费 $129/$249/$349 一次性）。两者类目体系完全不同，**不是同一批组件的免费/付费分层**。 |
| 交付形式 | 源码复制（copy-paste）或 `npx shadcn@latest add` 装进你的仓库；**没有 npm 运行时包**，没有 `node_modules` 依赖锁定，装完代码归你。 |
| 技术栈 | 免费站以**原生 WebGL/Canvas 手写着色器**为主（86 个），其次 CSS/DOM（约 50）、Motion（26）、GSAP（16）、OGL（9）、Three.js（4）、Matter.js（2）、WebGPU（2）。 |
| 打字机 | `TextType`（免费，React 状态机 + GSAP + CSS 光标）；Pro 有 `Ghost Type`（AI 补全式打字）、`Cipher Reveal`（乱码解码）、`Glyph Lottery`（老虎机落字）。 |
| 文字流光 | `ShinyText`（免费，CSS `background-clip:text` + 扫光）、`GradientText`（免费，CSS 渐变流动）、`GlareHover`（免费，光带扫过任意元素）。Pro 无同名"shimmer"，最接近 `Luminous Type`、`Blur Highlight`。 |
| 按钮点击动效 | `ClickSpark`（点击迸射火花，Canvas 2D）、`Magnet`（磁吸）、`SpecularButton`（WebGL 玻璃按钮）、`HoldButton`/`SlingButton`/`FuseButton`/`SquishSwitch`。**没有现成的 ripple 按钮**，ripple 只在 `RippleDistortion`（图片水波）与 Pro `Minimal Ripple`（背景）里。 |
| 边框流光 | `BorderGlow`（光标跟随的网格渐变发光边框，CSS mask）、`StarBorder`（星点沿轮廓跑，Canvas 2D）、`ElectricBorder`（电弧边框，Canvas 2D）。Pro 有 `Frame Border`（发光取景框）。 |
| 许可证 | 免费：MIT + Commons Clause v1.0 —— 可商用、可改，**不可转售/再分发组件本身（含移植版）**。Pro：个人授权，禁止再分发、禁止进公开仓库/UI Kit/组件库、禁止作为训练数据。 |

---

## 1. 两条产品线的定位

### 1.1 免费站 reactbits.dev

首页定位语："Animated components and backgrounds that **install as source you own**. Tune every value"。五个类目：Text Animations / Animations / Components / Micro Interactions / Backgrounds。适合当作"动效零件库"直接抄进项目。

### 1.2 Pro 站 pro.reactbits.dev

定位是"完整产品工具箱"：230 animated components + 300 marketing blocks（22 类）+ 300 Application UI blocks（38 类，含 AI Chat / Prompt Input / Agent Activity / Tool Calls / Agent Approval 等）+ 15 套 Next.js 模板 + 20 项 Agent Kit（给编码 Agent 的 skill/prompt/recipe）。类目为：Text / Backgrounds / 3D & Shaders / Cursor Effects / UI & Cards。

> 注：Pro 站组件页的**名称、描述、Props、实时预览是公开的**，只有 `Code` 标签页与 registry 需要 license key（页面显示 "Unlock <组件名> — Choose a plan"）。因此本报告的 Pro 组件名与说明来自公开页面，**实现技术无法逐一验证**，只能按类目给出判断。

---

## 2. 分类总览表

| 站点 | 类目 | 数量 | 定位 | 主要实现技术 | 授权 |
| --- | --- | ---: | --- | --- | --- |
| 免费 | Text Animations | 33 | 标题/文案的逐字、解码、打字、渐变、故障等文字动效 | GSAP 9、DOM/CSS 9、Motion 6、Canvas 4、WebGL 2、Matter.js 1 | 免费 |
| 免费 | Animations | 38 | 光标、悬停、边框、图片揭幕等"包裹式"动效 | WebGL/Canvas 18、DOM 8、GSAP 3、OGL 4、Three.js 1 | 免费 |
| 免费 | Components | 48 | 卡片、导航、轮播、画廊等成品 UI 块 | DOM 23、WebGL/Canvas 12、GSAP 4、OGL 2、Three.js 2、CSS 3 | 免费 |
| 免费 | Micro Interactions | 35 | 按钮、开关、指示器、输入等微交互 | Motion 19、DOM/CSS 9、Canvas 3、Three.js 1、Matter.js 1 | 免费 |
| 免费 | Backgrounds | 63 | 整屏背景（极光、粒子、网格、着色器） | WebGL 55、OGL 2、WebGPU 2、Three.js 2、CSS 1 | 免费 |
| **免费合计** | | **217** | | | |
| Pro | Text | 34 | 3D 字体、丝绸/烟雾/玻璃材质文字、解码与打字 | 未公开（页面 Props 可见 Motion 弹簧参数等线索） | 付费 |
| Pro | Backgrounds | 98 | 更重的着色器背景（体积光、流体、ASCII、CRT） | 未公开 | 付费 |
| Pro | 3D & Shaders | 49 | 3D 画廊、景深卡片、玻璃折射、发光边框 | 未公开（类目名即 shader 系） | 付费 |
| Pro | Cursor Effects | 21 | 光标拖尾/晕染/像素/丝带 | 未公开 | 付费 |
| Pro | UI & Cards | 28 | 卡片、轮播、列表、图表等界面块 | 未公开 | 付费 |
| **Pro 合计** | | **230** | | | |

> 数量口径：免费站侧边栏合计 217（README 写 215+/216，Micro 处 README 记 34、站点列 35，以站点为准）。Pro 站首页与侧边栏合计 230（34+98+49+21+28）。

---

## 3. 免费组件清单（217，技术实现取自源码 import）

技术列口径：`CSS` = 纯 CSS/内联样式动画；`DOM` = 手写 DOM/JS（requestAnimationFrame、指针事件、CSS 变量联动）；`Motion` = `motion`（Framer Motion）；`GSAP` = `gsap`；`Canvas` = `<canvas>` 2D 绘制；`WebGL` = 原生 WebGL 着色器（无三方引擎）；`OGL` = `ogl` 库；`Three.js` = three/R3F；`Matter.js` = 2D 物理；`WebGPU` = `vgpu`。

### 3.1 Text Animations（33）

| 组件 | 一句话说明 | 实现技术 |
| --- | --- | --- |
| TechText | 字母在指针下变成虚线矢量路径的字标 | Canvas |
| TextLoop | 沿 SVG 曲线无缝滚动的文字跑马灯 | GSAP |
| MaskedHeading | 文字被流动色块/图片遮罩，逐词揭示 | GSAP |
| ParticleText | 粒子聚合成文字，可打散重组 | Canvas |
| SplitFlapText | 机场翻牌式机械翻字 | CSS |
| WarpText | 指针附近的文字被 WebGL 扭曲折射 | OGL + Canvas |
| StrokeText | 描边字先"写"出来再灌入填充 | GSAP |
| DepthText | 立体挤出字 + 指针视差 | DOM |
| FoldText | 折纸展开式逐行入场 | GSAP |
| EchoText | 残影跟随并收拢成一个词 | DOM |
| SplitText | 拆分为字符/单词做错峰入场 | GSAP |
| BlurText | 由模糊到清晰的柔和入场 | Motion |
| CircularText | 字符环形排列，可旋转 | Motion |
| **TextType** | **打字机效果 + 闪烁光标，可调打字节奏** | **React 状态机 + GSAP 时间线（节奏与 typeEffect）+ CSS 光标** |
| Shuffle | 字符洗牌后落定 | GSAP + Canvas |
| **ShinyText** | **一道光扫过文字，可做金属/铬反光、辉光、跟随指针** | **CSS（background-clip:text）+ JS 渐变定位** |
| TextPressure | 指针"压力"让字符缩放变形 | DOM |
| CurvedLoop | 文字沿可拖拽曲线循环流动 | DOM |
| FuzzyText | 抖动模糊的文字 | Canvas |
| **GradientText** | **文字内部活渐变：线性扫过 / 网格漂移 / 锥形摆动** | **CSS（background-clip:text + mask）** |
| FallingText | 文字被物理打散、坠落堆叠、可拖拽 | Matter.js |
| TextCursor | 光标拖出一串文字/emoji | DOM |
| DecryptedText | 黑客式乱码逐步解码成真文字 | Motion + Canvas |
| TrueFocus | 逐词聚焦、其余虚化 | Motion |
| ScrollFloat | 随滚动漂浮/视差 | GSAP |
| ScrollReveal | 随滚动去模糊显现 | GSAP |
| ASCIIText | ASCII 字符波浪，指针倾斜、悬停乱码、点击涟漪 | WebGL |
| ScrambledText | 指针位置驱动的文字扭曲 | GSAP |
| RotatingText | 多句文案 3D 翻转轮换 | Motion |
| GlitchText | RGB 分离故障抖动 | DOM |
| ScrollVelocity | 跑马灯速度随滚动速度变化 | Motion |
| VariableProximity | 字重/字宽随指针距离连续变化 | DOM |
| CountUp | 数字滚动计数（支持格式/小数） | Motion |

### 3.2 Animations（38）

| 组件 | 一句话说明 | 实现技术 |
| --- | --- | --- |
| CrystalizedBall | 玻璃球 + 电弧边缘 + 随光标旋转的光尘 | OGL + Canvas |
| ElectricLogo | 任意 logo 变成带电轮廓，电弧外跳 | OGL + Canvas |
| DitherVeil | 1-bit 抖动照片，光标烧穿显真彩 | OGL + Canvas |
| GlowCursor | 光标注入的光晕流体 | WebGL |
| ScrollExpand | 圆角媒体框随滚动放大到满屏 | DOM |
| RippleDistortion | 指针水波位移扭曲内容并留衰减尾迹 | OGL |
| ElasticMesh | 文字/logo 变成果冻可挤压拉伸 | WebGL |
| SwarmCursor | 液态粒子群跟随光标并绕开按钮 | WebGL |
| HalftoneReveal | 半调网点在光标下膨胀成真实照片 | WebGL |
| PixelSwap | 内容以像素波逐块替换 | DOM |
| CursorGrid | 网格单元在光标后点亮并衰减 | WebGL |
| AnimatedContent | 滚动入场包裹器（滑移/模糊/3D 倾斜/擦除） | GSAP |
| FadeContent | 滚动淡入包裹器（含颗粒、雾、像素） | GSAP |
| **ElectricBorder** | **元素外包一圈电流，靠近光标处电弧迸射** | **Canvas 2D** |
| OrbitImages | 图片沿 SVG 路径环绕 | CSS |
| PixelTransition | 像素溶解遮罩切换内容 | Canvas |
| **GlareHover** | **高光光带按光标方向扫过任意元素** | **DOM/CSS（webkit-mask 渐变）** |
| LogoLoop | 品牌 logo 无缝循环跑马灯 | CSS |
| TargetCursor | 准星光标，四角括号吸附目标形状 | DOM |
| LaserFlow | 光束打在内容上并漫过边角 | WebGL |
| GhostCursor | 发光烟雾状残影跟随 | WebGL |
| GradualBlur | 头/尾/字幕的边缘渐进模糊 | DOM |
| **ClickSpark** | **每次点击迸射火花（线/彗尾/点/星），可溢出按钮外** | **Canvas 2D** |
| **Magnet** | **元素磁吸靠近光标，弹簧回位** | **DOM/JS（弹簧物理手写）** |
| Strands | 磨砂玻璃球内缠绕的光丝 | WebGL |
| StickerPeel | 可撕角、拖拽、甩动的贴纸 | WebGL |
| PixelTrail | 像素熔成流体黏液拖尾 | WebGL |
| Cubes | 3D 立方体阵列转向光标、点击涟漪 | WebGL |
| MetallicPaint | 液态铬流过文字/logo | WebGL |
| Noise | 胶片颗粒/灰尘/纸纹叠加 | Canvas |
| ShapeBlur | 形状在指针下失焦 | WebGL |
| Crosshair | 带坐标、可量测按钮尺寸的准星光标 | Canvas |
| ImageTrail | 光标图片拖尾（多种变体） | GSAP |
| Ribbons | 弹簧丝带拖尾 | WebGL |
| SplashCursor | 流体模拟拖尾 + 点击溅射 | WebGL |
| MetaBalls | 融合/拉丝/断裂的液态球 | WebGL |
| BlobCursor | 液态金属球光标（铬/果冻/珍珠/墨） | Three.js |
| **StarBorder** | **星点沿按钮/卡片精确轮廓巡游并拖出星尘** | **Canvas 2D** |

### 3.3 Components（48）

| 组件 | 一句话说明 | 实现技术 |
| --- | --- | --- |
| HoloCard | 真全息烫金 + 随倾斜闪粉的收藏卡 | WebGL |
| CircularCarousel | 3D 环形图片轮播，可弯折、惯性拖拽、吸附 | CSS |
| FlexCarousel | 无限横向图片流，边缘经"液态玻璃"折射 | OGL + Canvas |
| InfiniteSpiral | 无限循环的 3D 螺旋图片墙 | CSS |
| DepthCarousel | 卡片沿 3D 轨道后退，支持拖拽/键盘/自动 | GSAP |
| MorphSlider | 图片间熔融位移过渡的 WebGL 滑块 | OGL + GSAP |
| DriftWall | 透视瓷砖墙持续漂移，悬停抬起 | CSS |
| AccordionGallery | 手风琴面板展开露出视差图与说明 | GSAP |
| **SpecularButton** | **玻璃按钮，边缘吃光，高光随光标滑动** | **WebGL（Canvas 着色器）** |
| OptionWheel | 弧形选项轮，滚动/拖拽/方向键旋转 | DOM |
| CurvedInput | 沿弧线弯曲的输入框（文字、光标、按钮同弯） | CSS |
| LineSidebar | 侧边导航，光标邻近项高亮位移 | DOM |
| AnimatedList | 行弹入的滚动列表，选中项滑动 | CSS |
| ScrollStack | 滚动时卡片钉住堆叠，回落成暗色牌堆 | DOM |
| BubbleMenu | 圆形气泡展开菜单，子项错峰出现 | GSAP |
| MagicBento | Bento 网格，边缘光随光标、点击波纹 | Canvas |
| CircularGallery | 弧形图片廊，可拖拽/滚动/键盘，点开大图 | WebGL |
| ReflectiveCard | 金属工牌，反射摄像头或循环视频 | WebGL |
| CardNav | 导航栏弹开成一排卡片 | CSS |
| Stack | 可拖拽/甩飞/点击翻的卡片堆 | Motion |
| FluidGlass | 3D 玻璃体折射标题/图/视频，可熔变形 | WebGL |
| PillNav | 胶囊导航，填充上涌 + 标签滚动 + 滑动圆点 | CSS |
| TiltedCard | 随光标倾斜的 3D 卡片（眩光、浮层、翻面） | DOM |
| Masonry | 瀑布流画廊，弹簧入场、重排、灯箱 | CSS |
| GlassSurface | Apple 风液态玻璃，弯曲背后内容 | WebGL |
| DomeGallery | 半球面投影的 3D 穹顶画廊 | CSS |
| ChromaGrid | 灰度照片网格，光标聚光还原彩色 | CSS |
| Folder | 可开合、可抽取内页的文件夹 | WebGL |
| StaggeredMenu | 全屏菜单，子项错峰入场 | GSAP |
| ModelViewer | 产品级 3D 模型查看器（含软阴影） | Three.js |
| Lanyard | 可拖拽/甩动/点击翻面的工牌挂绳 | Three.js + Canvas |
| ProfileCard | 随光标倾斜、全息烫金的资料卡 | CSS |
| Dock | macOS 风格 Dock（放大、启动弹跳、徽标、右键菜单） | CSS |
| GooeyNav | 选中胶囊化开成"黏液"流到目标项 | WebGL |
| PixelCard | 悬停像素点亮并扩散的卡片 | Canvas |
| Carousel | 可滑卡片轮播（5 种过渡 + 自动播放） | CSS |
| SpotlightCard | 跟随指针的聚光灯卡片，光会溢到邻卡 | DOM |
| **BorderGlow** | **网格渐变发光边框，随光标方向增强、边缘更亮** | **CSS（mask + CSS 变量，指针驱动）** |
| FlyingPosters | 滚动/拖拽时扭转翻飞的海报柱 | WebGL |
| CardSwap | 定时或甩动把前卡送到底部的 3D 牌堆 | DOM |
| GlassIcons | 液态玻璃图标（弯折背后颜色） | WebGL |
| DecayCard | 指针划过时图片撕裂熔解又复原 | WebGL |
| FlowingMenu | 全高菜单，液态色带在行间流动 + 跑马灯预览 | CSS |
| ElasticSlider | 光标下放大、拉过头像橡皮筋回弹的滑块 | Canvas |
| Counter | 里程表式数字滚动（货币/分隔符/多语言） | DOM |
| InfiniteMenu | 可拖拽的图片球体，最近一张吸附到前面 | WebGL |
| Stepper | 多步流程，指示器滑动 + 弹簧过渡 | CSS |
| BounceCards | 扇形照片卡弹入、散开、悬停回正 | CSS |

### 3.4 Micro Interactions（35）

| 组件 | 一句话说明 | 实现技术 |
| --- | --- | --- |
| **FlyingButton** | **悬停点火、WebGL 烟雾助推起飞、落回自身云团** | **WebGL** |
| Shredder | 列表底部碎纸机，拖入的行被切成卷条 | Canvas |
| PaperCrumple | 按住拖拽把图片揉成有质感的 3D 纸团 | Three.js |
| TearTicket | 票据沿齿孔被手撕下并掉落 | Motion |
| FlipCard | 点击/拖拽/甩动 3D 翻面卡，弹簧落定 | Motion |
| BranchedMenu | 折叠菜单从主干分叉并画出选中连线 | CSS |
| FolderFloat | 文件夹打开时便签弹成漂浮云 | Matter.js |
| RefineFrame | 媒体框原地切换生成阶段（无布局跳动） | Canvas |
| ThoughtLine | 推理过程标题行 + 实时计时，完成后折叠成一行 | Motion |
| VoicePill | 麦克风按钮胀成带均衡器与计时的胶囊 | Canvas |
| SloshGauge | 液位随数值追赶、倾斜、满格飞溅 | CSS |
| PromptBar | 聊天输入条（@来源、/命令、模型选择、听写、附件） | Motion + Canvas |
| SwipeToast | 下滑关闭、带燃烧引信的 Toast | Motion |
| **SlingButton** | **像弹弓一样向后拉再松手发射的发送按钮** | **Motion** |
| BellToggle | 按下"响铃"+标签交叉淡入+胶囊展开的开关 | Motion |
| CallChip | 工具调用 chip，填充随计时扫过，成功变绿/失败抖动 | CSS |
| StatusMark | 任务状态字形：圆环→进度弧→对勾形变 | Motion |
| GlideSelect | 选择 chip，菜单从角落弹出、高亮滑动 | CSS |
| SwipeRow | 列表行滑动露出操作，满滑删除 | Motion |
| JellyRadio | 芯片单选组，选中项膨胀挤开邻居 | Motion |
| CometDial | 刻度环拨盘，指针头拖出彗尾 | Motion |
| WakeSlider | 无滑块细条滑杆，拖动速度带出尾迹 | Motion |
| CodeSlots | 验证码输入，数字弹入槽位，支持粘贴/自动填充 | Motion |
| DodgeField | 包裹器让任意子元素躲避指针后再滑回 | Motion |
| LatticeLoader | 格阵按波次点亮 + 秒表的状态行 | CSS |
| ScrubField | 可拖拽擦洗数值的 chip（橡皮筋边界、点击输入） | Motion |
| FuseButton | 完成态带"引信"倒计时的撤销按钮 | CSS |
| WarmTooltip | 第一个 tooltip 等待、同组其余秒开 | Motion |
| SlideCommit | 滑动确认手柄，执行时旋转、完成展开成胶囊 | Motion |
| RubberSegment | 分段控件，橡胶滑块拉伸过缝并压扁落位 | Motion |
| PulseHeart | 点赞按钮收缩成点、翻色、带计数脉冲 | CSS |
| SpringCheck | 复选框：弹簧填充 + 画勾 + 删除线 | Motion |
| PeekRating | 星级评分，指针位置掀起星浪，点击定值 | CSS |
| HoldButton | 长按确认按钮，液面上升，松手回弹 | CSS |
| SquishSwitch | 开关滑块随速度拉伸、到端点压扁 | Motion |

### 3.5 Backgrounds（63）

| 组件 | 一句话说明 | 实现技术 |
| --- | --- | --- |
| GradientASCII | ASCII 字符画出的柔和渐变，光标处乱码 | WebGL |
| FluxLines | 磁流体般翻涌的发光流线 | WebGL |
| PatternWaves | 半调点/线/字形的"丝绸"表面 | OGL + Canvas |
| MicroSlats | 透视中的微小板条海面，浪尖反光 | OGL + Canvas |
| ShapeWaves | 三角/圆/方形随波起伏变亮 | WebGPU + Canvas |
| AeroShards | 厚玻璃碎片丝带在多层深度中流动 | WebGPU + Canvas |
| GhostFibers | 多层细光纤丝带扭转漂浮 | WebGL |
| CRTWarp | 曲面 CRT 上的块状等离子 + 扫描线/荧光点 | WebGL |
| MoltenMetal | 白热核心的熔融焦散丝，光标加热、点击爆闪 | WebGL |
| GradientWaves | 缎面光波从雾霭地平线推来 | WebGL |
| WebThreads | 穿过光结的发光丝线，光标点亮、点击传光 | WebGL |
| Topography | 等高线绘制的 3D 地形，光标处隆起 | WebGL |
| LightTunnel | 光纤隧道中光彗星冲入纵深 | WebGL |
| SlicedWaves | 切成发光条带的光浪 | WebGL |
| AcidSquares | 双色光源下的光泽方块场 | WebGL |
| Scanner | 扫描光束扫过干涉线 + CRT 质感 | WebGL |
| Ferrofluid | 磁流体海面，浪尖成刺，光标掀起"冠" | WebGL |
| Lightfall | 弯曲隧道中下落的光条，按住变曲速 | WebGL |
| LiquidEther | 光标搅动的发光液体，流速决定颜色 | WebGL |
| Prism | 旋转的棱镜光谱 | WebGL |
| DarkVeil | 黑暗中飘动、绕开光标的光纱 | WebGL |
| LightPillar | 载入即点燃、朝光标倾斜的光柱 | WebGL |
| Antigravity | 粒子升成光标周围光环，点击爆开 | WebGL |
| Silk | 缎面褶皱，朝光标转向、点击起涟漪 | WebGL |
| FloatingLines | 细光丝带波动、绕开光标 | WebGL |
| SideRays | 从边角射入的光束，缓慢闪烁 | WebGL |
| LightRays | 体积光，光标可转向并投影 | WebGL |
| PixelBlast | 抖动像素云，光标点亮、可加涟漪 | WebGL |
| ColorBends | 流动的鲜艳色彩弯折 | Three.js |
| LineWaves | 细线丝滑波动，一条光带穿过 | WebGL |
| Radar | 雷达扫描，荧光余辉 + 移动目标 | WebGL |
| SoftAurora | 3D Perlin 噪声的柔和极光 | WebGL |
| MagicRings | 脉冲外扩的光环，朝光标膨胀 | WebGL |
| Aurora | 页面顶部流动、朝光标漂移的极光 | WebGL |
| Plasma | 黑暗中缓慢扭转的缎面光 | WebGL |
| PlasmaWave | 两条互相缠绕的等离子带 | WebGL |
| Particles | 3D 粒子场（辉光、闪烁、星座连线） | WebGL |
| GradientBlinds | 聚光灯下的缎面渐变百叶 | WebGL |
| Grainient | 可被光标搅动的颗粒渐变 | WebGL |
| GridScan | 3D 网格房间被扫描光扫过 | WebGL |
| Beams | 暗色中起伏反光的光泽丝带 | WebGL |
| PixelSnow | 像素雪花分层下落，可被光标拨开 | WebGL |
| Lightning | 分叉闪电，朝光标弯曲、点击落雷 | WebGL |
| PrismaticBurst | 棱彩光束爆发，点击扩散光波 | WebGL |
| Galaxy | 星际穿行，曲速跳跃 + 光标斥力 | WebGL |
| Dither | 复古抖动波纹（Bayer/半调/线/噪声） | WebGL |
| FaultyTerminal | 闪烁 CRT 终端字，荧光拖尾 + 故障 | WebGL |
| RippleGrid | 如水面起伏的网格 | WebGL |
| DotField | 透镜下的渐变点阵（放大/挤压/漩涡） | WebGL |
| DotGrid | 可拨动、点击冲击波的果冻点阵 | WebGL |
| Threads | 会散边、绕开光标的流动丝线 | WebGL |
| Hyperspeed | 夜路光轨，按住进入曲速 | Three.js + Canvas |
| Iridescence | 可搅动的液态虹彩表面 | WebGL |
| Waves | 丝滑密集线条，绕开光标再弹回 | WebGL |
| MagnetLines | 磁力线朝光标摆动，点击旋转 | WebGL |
| GridDistortion | 图片被光标切成网格块再复位 | WebGL |
| Ballpit | 可推、抓、甩、轰散的物理球池 | WebGL |
| Orb | 呼吸的发光色环，带轨道光并伸向光标 | WebGL |
| LetterGlitch | 字母场闪烁乱码，光标搅动、点击撕裂 | WebGL |
| GridMotion | 倾斜瓷砖墙随指针滑动并点亮 | DOM |
| ShapeGrid | 漂移形状网格，光标点亮 + 彩虹拖尾 | Canvas |
| LiquidChrome | 暗色池中翻涌的液态铬丝带 | WebGL |
| Balatro | Balatro 风格油漆漩涡着色器 | WebGL |

---

## 4. Pro 组件清单（230，源码需授权）

> **技术实现说明**：Pro 站每个组件页公开"描述 + 实时预览 + 完整 Props 表"，但 `Code` 标签页被替换为 "Unlock <组件名>" 付费墙，registry（`pro.reactbits.dev/r/*`）返回 404/需 key。因此**下表不逐条标注实现技术**（避免编造）。可确认的线索：3D & Shaders 整个类目为 WebGL/着色器类；Text 类多为 DOM/Canvas + 弹簧动效（如 3D Letter Swap 的 Props 暴露 `animation: ValueAnimationTransition`、`{type:'spring'}`，即 Motion 体系）；Pro 许可证第 5.1 条列出的三方依赖为 React、Next.js、Tailwind、**Motion、GSAP、Three.js、lucide**。

### 4.1 Text（34）

| 组件 | 说明 |
| --- | --- |
| 3D Letter Swap | 字母 3D 翻转做悬停换字（Motion 弹簧 + CSS 3D） |
| 3D Text Reveal | 文字随滚动在 3D 圆柱面上转动 |
| ASCII Ripple | 文字在光标下像水面起涟漪 |
| Bending Marquee | 沿曲线弯曲滚动的跑马灯 |
| Blur Highlight | 段落模糊淡入，关键词高亮 |
| Cipher Reveal | 标题从乱码中解码出来 |
| Domino Lettering | 字母像多米诺倒下再重建 |
| Elastic Lettering | 可抓住拉伸、甩出的橡皮筋标题 |
| **Ghost Type** | **标题自写，并用 AI 式"幽灵补全"逐词接龙（打字机变体）** |
| Glitch Text | 光标下故障抖动 |
| Glyph Lottery | 字母像老虎机转轮锁定成标题 |
| Gravity Letters | 字形沙粒标题，可切开、坠落、回流 |
| Label Orbit | 标签变成光标并拖出 3D 堆叠 |
| Luminous Type | 漂移的聚光灯把暗字照亮（流光/扫光感） |
| Mesh Lettering | 丝绸质感的标题，微风起伏、触碰鼓动 |
| Orbital Type | 旋转地球，外面绕着手可拨动的文字环 |
| Particle Text | 粒子构成、被光标打散的文字 |
| Ribbon Type | 印在缎带上的文字在 3D 中扭转飘动 |
| Rising Ink | 字母在光标附近从纸面立起 |
| Shatter Type | 玻璃碎片拼成的标题，光标下开裂、点击碎裂 |
| Signal Type | 霓虹灯式闪烁点亮的标题 |
| Smoke Type | 标题逐字从烟雾中凝结 |
| Speeding Text | 数字/文字带速度模糊地切换 |
| Spring Lettering | 字母像弹簧追着光标倾斜 |
| Staggered Text | 按字母/词/行错峰入场 |
| Stipple Type | 大理石纹墨标题，搅动后碎成点阵 |
| Tessera Trail | 光标拖出弹跳字母方块的轨迹 |
| Text Cube | 跟随光标的 3D 文字立方体 |
| Text Morph | 词与词逐字母变形，共有字母滑移归位 |
| Text Path | 沿曲线路径流动的文字 |
| Text Scatter | 悬停时字母散开再落回 |
| Typographic Wall | 整墙乱码逐行解码出零散单词 |
| Vapor Type | 文字从蒸汽中凝结又飘散 |
| Wave Lettering | 成片文字如海面起伏、进出焦点 |

### 4.2 Backgrounds（98）

| 组件 | 说明 |
| --- | --- |
| ASCII Tiles | 发光 ASCII 字符构成的玻璃瓷砖 |
| Ascii Waves | ASCII 字符组成的波浪 |
| Astral Shell | 缓慢旋转的星座连线球 |
| Aura Blob | 柔光团 + 流动光晕 |
| Aurora Beam | 扫过的极光光束 |
| Aurora Blur | 柔和模糊的极光 |
| Axial Beam | 从画框外升起的光线 |
| Binary Orbits | 倾斜的旋臂星系，星点流过 |
| Black Hole | 烟雾状光绕黑洞与光子环弯折 |
| Blinking Dots | 明灭点阵 |
| Blinking Squares | 微微闪烁的小方块网格 |
| Blurred Rays | 柔和竖光在光谱间闪烁 |
| Chroma Blinds | 彩色斜纹朝光标弯曲 |
| Chroma Current | 光流穿过发光点阵 |
| Chroma Waves | 带色散微光的柔波 |
| Cloud Atlas | 可像风一样推动的翻涌云层 |
| Color Loops | 从中心循环外扩的同心色环 |
| Concentric Tides | 细光弧收束成明亮沙漏 |
| Contour Tide | 粒子海洋起伏 |
| Dappled Light | 阳光穿过摇曳树叶投在墙上 |
| Dither Wave | 复古抖动风格的流波 |
| Dot Shift | 位移的发光点阵 |
| Eclipse | 暗体遮住变色日冕 |
| Fading Stars | 带着渐隐尾迹升起的星 |
| Falling Rays | 向下扇开的光脉冲 |
| Flame Paths | 发光火舌随风腾起 |
| Fog Sphere | 柔和旋转的雾球 |
| Glass Flow | 透过流动条纹玻璃看到的图/视频 |
| Glass Tiles | 闪烁的彩色玻璃瓷砖 |
| Glimmer Wrap | 细碎反光掠过 |
| Glitter Warp | 闪粉星场曲速隧道 |
| Glowing Ridges | 虹彩光脊如折绸滚动 |
| Glowing Wave | 单道发光波滚过 |
| Glue Dots | 黏连、拉伸分离的点 |
| Glyph Ember | ASCII 火焰从炽热字床升起 |
| Glyph Orb | 条纹 ASCII 星球缓慢自转 |
| Glyph Sonar | 声呐扫过字形场，点亮游动鱼群 |
| Glyph Tide | ASCII 潮水涨落 |
| Gradient Bars | 竖向渐变条成波移动 |
| Grain Wave | 颗粒质感色带在暗中摆动 |
| Halftone Vortex | 半调点构成的漩涡 |
| Halftone Wave | 半调点阵随噪声起伏 |
| Hexagonal Vault | 六边形网格，柔光跟随光标 |
| Horizon Bloom | 暗行星边缘的日出光芒 |
| Interference Ribbons | 细光丝带漂移扭转 |
| Landscape | 无尽地景滚向地平线 |
| Light Droplets | 如雨下落的光条 |
| Lightspeed | 曲速跳跃的星线 |
| Liquid Bars | 光泽液柱起伏 |
| Liquid Lines | 液态流动的光条 |
| Long Exposure | 夜间公路光轨 |
| Luminous Filaments | 从亮源扇形展开的光纤 |
| Metallic Swirl | 液态金属漩涡 |
| Minimal Ripple | 从中心扩散的同心涟漪 |
| Mosaic | 覆盖在动态波浪/视频上的马赛克 |
| Mosaic Waves | 马赛克瓷砖中的波浪 |
| Neon Reveal | 霓虹管点亮，露出下方内容 |
| Neural Flash | 发光丝暴，如思维放电 |
| Neural Float | 柔和神经丝在暗中漂浮 |
| Neural Tunnel | 脉动神经束构成的无尽隧道 |
| Nexus Rays | 从发光核心辐射的激光 |
| Perspective Grid | 朝地平线滚动的无尽网格 |
| Photon Knot | 半透明光带系成缓慢转动的结 |
| Pixel Rain | 像素化数字雨 |
| Prismatic Slats | 透过条纹玻璃折射的彩色液体 |
| Radial Liquid | 从中心扩散的液体涟漪 |
| Ravine | 沿黑暗峡谷无尽飞行 |
| Retro Lines | 朝复古地平线退去的波纹线 |
| Ring Field | 细尘组成的波状环向外漂 |
| Rising Lines | 从发光地平线升起的线光 |
| Rising Particles | 向上飘的柔光粒子 |
| Rolling Blinds | 横扫画面的竖百叶光 |
| Rotating Stars | 圆形旋转星轨 |
| Rubber Fluid | 光泽橡胶褶皱缓慢漂移 |
| Satin Ridges | 流动缎面褶皱接住柔光 |
| Shader Waves | 平滑流动的色彩波浪 |
| Shadow Bars | 明暗交替的竖条 |
| Silk Waves | 如垂坠丝绸的波浪 |
| Simple Swirl | 可给惯性的柔光漩涡 |
| Specter Orb | 烟雾缠绕的幽光球 |
| Spectral Clouds | 光谱云雾（页面无描述文案） |
| Spectral Drape | 3D 折叠的发光点幕 |
| Spiral Funnel | 细光丝沿漩涡上升 |
| Square Matrix | LED 网格泛起光波 |
| Squares Terminal | 终端风格方块忽明忽暗 |
| Squircle Shift | 发光方圆形网格形变 |
| Star Swipe | 扫入曲速的光条 |
| Swirl Blend | 鲜艳色彩如丝绸旋混 |
| Synaptic Shift | 发光神经须脉动位移 |
| Tech Wall | 被移动光扫过的发光面板墙 |
| Terminal Rain | 分层列下落的发光字形 |
| Thinking Dots | 点阵在漂移云下鼓胀 |
| Twilight Lines | 暖色扫光下脉动的线条 |
| Vortex | 无尽旋转的粒子隧道 |
| Voxel Arc | 方形体素构成的弧形海面 |
| Warp Twister | 雾与尘组成的扭转管 |
| Watercolor | 两色如水彩相融 |
| Wireframe Ball | 可拖拽旋转的线框球 |

### 4.3 3D & Shaders（49）

| 组件 | 说明 |
| --- | --- |
| Agentic Ball | 内部缓慢旋涡的光泽 3D 球 |
| AI Blob | 会听、会想、会说的发光玻璃球（AI 形象） |
| Album Rail | 扇形展开的唱片封套，内含黑胶 |
| Bend Gallery | 随滚动弯折远离的图片列 |
| Chrome Orbit | 嵌套铬环如陀螺旋转，点击张成光环 |
| Circle Stack | 倾斜的圆片堆循环切换图片 |
| Concave Carousel | 环绕观众的弧形画廊墙 |
| Constellation Gallery | 照片卡在圆环/螺旋/球体间流动 |
| Contact Sheet | 照片从中心流出现影 |
| Depth Card | 随光标产生景深倾斜的卡片 |
| Depth Image | 用深度图按光标重打光的照片 |
| Depth Ribbon | 在 3D 空间中蜿蜒的图片带 |
| Device | 棚拍质感 3D 手机样机 |
| Dolly Gallery | 滚动时穿越的纵深图片堆 |
| Elastic Reel | 弹性胶片卷（页面无描述文案） |
| Elastic Sticker | 可撕下再贴回的贴纸 |
| Ember Reveal | 烧穿的洞露出下一张图 |
| Expanding Grid | 人像网格，光标下放大 |
| **Frame Border** | **清晰的发光边框，可框住任意内容** |
| Glass Reveal | 玻璃透镜透过一张图看另一张 |
| Globe | 带动态弧线的点阵 3D 地球 |
| Gradient Blob | 渐变融球（页面无描述文案） |
| Helix Gallery | 螺旋画廊（页面无描述文案） |
| Infinite Gallery | 无尽 3D 图片场中漂移 |
| Inverted Dome | 可拖拽、内凹穹顶式的图片网格 |
| Iris Gallery | 椭圆照片阵变成光圈 |
| Lenticular Carousel | 卡片像光栅印刷般翻转 |
| Momentum Ring | 转动的照片环，旋转时模糊、停位清晰 |
| Page Flip | 可拖拽翻页的书页效果 |
| Parallax Carousel | 可拖拽的视差图片轮播 |
| Particle Image | 粒子构成、可旋散重组的图片 |
| Particle Morph | 半调点阵从一张图变形到下一张 |
| Passage Gallery | 穿越照片隧道的滑行 |
| Pixel Reveal | 像素扫过揭示图片 |
| Pixel Sculpt | 图片重建为 3D 瓷砖，光标下起伏 |
| Pixelate Hover | 光标下像素化/变清晰 |
| Pond Image | 可像液体一样搅动的照片 |
| Portal | 可点击穿越的曲速光门 |
| Prism Carousel | 每张图扫入新色彩 |
| Rotating Cards | 可拖拽的 3D 环形卡片 |
| Scroll Bend | 图片条随滚动速度膨胀/收窄 |
| Scroll Portal | 层层嵌套的画框滚动 |
| Shader Card | 背后升起发光火焰的内容卡 |
| Shader Reveal | 液体光标轨迹揭示第二张图 |
| Spin Shutter | 旋转照片轨道，指向处对焦 |
| Star Burst | 从一点流出的星爆 |
| Tumble Carousel | 卡片翻着跟头推进的轮播 |
| Twisting Gallery | 滚动经过时扭转摆动的图片 |
| Warped Card | 光标下鼓起的图片卡 |

### 4.4 Cursor Effects（21）

| 组件 | 说明 |
| --- | --- |
| Arc Cursor | 跟随光标的爆裂电弧 |
| Ascii Cursor | 留下 ASCII 字符轨迹的光标 |
| Celebration Cursor | 光标洒落纸屑彩带，点击爆开 |
| Chroma Halo | 光标后绽开的柔墨 |
| Cursor Wave | 随光标起伏的形状网格 |
| Custom Cursor | 圆环+圆点光标，围绕悬停元素变形 |
| Dither Cursor | 像素抖动风拖尾 |
| Drafting Cursor | 制图风十字准星、标尺、坐标与量距 |
| Glass Cursor | 折射下方图像的玻璃光标 |
| Glyph Stream | 液态字形方块流跟随光标，点击溅开 |
| Grid Rise | 光标下升起、起伏的瓷砖场 |
| Gyroscope Cursor | 会朝移动方向转向的箭头光标 |
| Liquid Ascii | ASCII 画的晃荡水体 |
| Parallax Pills | 随光标漂移的弹跳标签胶囊 |
| Pigment Trail | 在光标后作画的墨笔 |
| Pixel Magnet | 跟随光标的像素群 |
| Ribbon Trail | 体操彩带式拖尾 |
| Smooth Cursor | 平滑弹簧拖尾 |
| Snapshot Trail | 照片拖尾，像相纸般倾斜翻落 |
| Stardust Cursor | 流体力场上的细尘，点击蘑菇云 |
| User Cursor | 带名字标签的协作者光标 |

### 4.5 UI & Cards（28）

| 组件 | 说明 |
| --- | --- |
| Animated List | 新条目动画插入的实时列表 |
| Card Spread | 悬停展开的扇形牌组 |
| Center Flow | 中枢向节点流出脉冲 |
| Chroma Card | 倾斜图片卡，悬停 RGB 故障 |
| Circle Gallery | 可拖拽惯性旋转的圆形图片阵 |
| Circles | 环绕中心的多环图片 |
| Click Stack | 可逐张点击翻阅的卡片堆 |
| Comparison Slider | 前后对比滑块 |
| Credit Card | 悬停 3D 倾斜的信用卡 |
| Draggable Grid | 可带惯性拖动的网格 |
| Frame Scrub | 随滚动播放的图片序列 |
| Gradient Carousel | 3D 轮播并让背景染上当前卡片色 |
| Hover Preview | 文字悬停显示图片预览 |
| Liquid Swap | 图像通过液态玻璃球切换 |
| Loupe Image | 在照片上滑动放大的放大镜 |
| Magic Transform | 文档飞入、变成彩色结果 |
| Modal Cards | 卡片展开成全屏弹窗 |
| Orbit Reel | 转动卡片轮扫成弧形 |
| Parallax Cards | 随光标产生纵深位移的层叠卡 |
| Preloader | 五种样式的加载页 |
| Reel Gallery | 倾斜胶片列随滚动滑行 |
| Scroll Mask | 滚动时通过遮罩揭示图片 |
| Scroll Stack | 滚动时堆叠并淡出的卡片 |
| Simple Graph | 平滑动画折线图 |
| Skewed Carousel | 滑动时倾斜的轮播 |
| Tile Reveal | 图片瓷砖飞入拼出标题 |
| Tilted Tiles | 倾斜的图片列墙滚动经过 |
| Tumble Wall | 照片/头像/标签如雨落下并可控抛掷 |

---

## 5. 四类重点需求对照

### 5.1 打字机（typewriter）

| 组件 | 站点 | 技术实现 | 说明 |
| --- | --- | --- | --- |
| **TextType** | **免费** | **React 状态机（useState/定时器逐字增删）+ GSAP 时间线（`timeline`/`delayedCall`/`to` 控制节奏与 `typeEffect`）+ CSS 光标** | **最标准的打字机**。Props：`typingSpeed`、`deletingSpeed`、`pauseDuration`、`loop`、`cursorStyle`（character/bar/block/underscore）、`deleteMode`（backspace/select）、`typeEffect`（none/fade/blur/rise）、`mistakes`（模拟打错再修正）、`variableSpeed`、`startOnVisible`、`onSentenceComplete` |
| SplitFlapText | 免费 | CSS（3D 翻转） | 机场翻牌，逐字"翻"出，非打字机但同为逐字揭示 |
| DecryptedText | 免费 | Motion + Canvas | 乱码滚动后解码，常用于"打字机"替代 |
| ScrambledText | 免费 | GSAP | 指针位置扭曲文字 |
| TextCursor | 免费 | DOM | 只有光标/拖尾，无打字逻辑 |
| **Ghost Type** | **Pro** | 未公开（Props 显示 typeSpeed/streamSpeed/thinkDelay/acceptDelay/holdDelay/caret/hint/sweep） | **AI 补全式打字机**：先打主句，再用幽灵文字逐词补全、接受、清除、循环 |
| Cipher Reveal | Pro | 未公开 | 标题从乱码解码 |
| Glyph Lottery | Pro | 未公开 | 老虎机式逐字锁定 |
| Smoke Type / Vapor Type | Pro | 未公开 | 烟雾/蒸汽逐字凝结 |
| Speeding Text | Pro | 未公开 | 带速度模糊的字符切换 |

> 结论：**打字机存在且就叫 `TextType`（免费）**；Pro 侧没有叫 Typewriter 的组件，`Ghost Type` 是"AI 补全"变体。

### 5.2 文字流光 / shimmer / 渐变扫过

| 组件 | 站点 | 技术实现 | 说明 |
| --- | --- | --- | --- |
| **ShinyText** | **免费** | **纯 CSS：`background-clip:text` + `-webkit-text-fill-color:transparent`，JS 只负责按帧推进渐变位置** | **文字扫光**。Props：`speed`、`delay`、`angle`、`shineWidth`、`softness`、`bands`（多道光带）、`glow`（辉光层，`filter:blur`）、`direction`、`easing`（smooth/linear/snappy）、`trigger`（loop/hover/view）、`yoyo`、`followPointer`、`pauseOnHover` |
| **GradientText** | **免费** | **纯 CSS：`background-clip:text` + `mask`，渐变角度/位置由 CSS 变量驱动** | **文字渐变流动**：三种模式（滑动线性扫过 / 漂移网格 / 摆动锥形扇形），支持渐变描边（`mask-composite: exclude`）与指针跟随配色 |
| GlareHover | 免费 | DOM/CSS（`-webkit-mask` 渐变 + 指针方向） | 光带按光标方向扫过**任意元素**（按钮、卡片、文字容器） |
| Luminous Type | Pro | 未公开 | 漂移聚光灯把暗字逐段照亮（"流光"观感） |
| Blur Highlight | Pro | 未公开 | 段落模糊淡入 + 关键词高亮 |
| Mesh Lettering / Ribbon Type | Pro | 未公开 | 丝绸/缎带材质文字（3D 光泽而非扫光） |

> 结论：有 shimmer，名字是 **`ShinyText`**（免费）；渐变扫过是 **`GradientText`**（免费）。Pro 侧没有同名 shimmer，最接近 `Luminous Type`。

### 5.3 按钮类动效

| 组件 | 站点 | 技术实现 | 说明 |
| --- | --- | --- | --- |
| **ClickSpark** | **免费** | **Canvas 2D 覆盖层** | **点击迸射**：`shape`（line/streak/dot/star）、`sparkCount`、`sparkRadius`、`duration`、`easing`（含 spring）、`gravity`、`spread`/`direction`、`glow`、`ring`（扩散圆环）、`layer`（front/back，可让火花绕按钮外溢出）、`ref.spark(x,y)` 程序触发 |
| **Magnet** | **免费** | DOM/JS（手写弹簧） | **磁吸按钮/元素**，指针靠近时吸附、离开回弹 |
| SpecularButton | 免费 | WebGL（Canvas 着色器） | 玻璃按钮，边缘吃光、高光随光标滑动 |
| HoldButton | 免费 | CSS（液面填充） | 长按确认，松手回弹 |
| SlingButton | 免费 | Motion | 弹弓式"拉后发射"发送按钮 |
| FuseButton | 免费 | CSS | 完成态带引信倒计时的撤销按钮 |
| FlyingButton | 免费 | WebGL | 悬停点火、烟雾助推起飞 |
| SpringCheck / SquishSwitch | 免费 | Motion | 勾选/开关的弹簧反馈 |
| Click Stack | Pro | 未公开 | 卡片点击翻阅（非按钮） |

> 结论：**没有现成的 Material ripple 按钮**。最接近"点击反馈"的是 `ClickSpark`（Canvas 火花/圆环）；"magnetic button"= `Magnet`；"shiny button"= `SpecularButton`（WebGL）或 `StarBorder`/`BorderGlow` 包一层。ripple 语义只出现在 `RippleDistortion`（图片水波）和 Pro `Minimal Ripple`（背景）。

### 5.4 边框流光 / 发光边框

| 组件 | 站点 | 技术实现 | 说明 |
| --- | --- | --- | --- |
| **BorderGlow** | **免费** | **CSS：`mask`/`mask-composite` 做边框 + 多层 radial/conic 渐变，CSS 变量由指针事件驱动** | **最匹配"发光渐变边框"**：网格渐变边框、随光标方向增强、越靠边越亮、圆角任意、可包卡片 |
| **StarBorder** | **免费** | **Canvas 2D**（沿元素圆角轮廓采样） | 星点沿按钮/胶囊/卡片的**精确轮廓**巡游，拖出光与星尘 |
| **ElectricBorder** | **免费** | **Canvas 2D**（电弧抖动） | 电流边框，靠近光标处电流增强、向外迸火花 |
| GlareHover | 免费 | CSS mask | 光带扫过（元素表面，不是边框） |
| Frame Border | Pro | 未公开（3D & Shaders 类） | "清晰发光的边框，框住任意内容" |

> 结论：**边框流光有三个免费实现**（`BorderGlow` 最接近 fancy gradient border，`StarBorder`/`ElectricBorder` 为描边巡游），Pro 补充 `Frame Border`。

---

## 6. 安装与依赖

### 6.1 免费站

- **复制粘贴**：组件页 `Code` 标签 → 选 JS/TS 与 CSS/Tailwind → 拷贝文件 → 按页面列出的依赖自行安装。
- **CLI（推荐）**：
  ```bash
  npx shadcn@latest add @react-bits/TextType-TS-TW
  ```
  命名规则：`@react-bits/<Component>-<JS|TS>-<CSS|TW>`，例如 `ShinyText-JS-CSS`、`BorderGlow-TS-TW`。CLI 会同时写入 `dependencies`。
- **没有 npm 运行时包**：源码进你的仓库（`components/` 下），装完不依赖 React Bits 运行时，也不需要锁版本。
- **MCP**：官方提供 MCP server（`/get-started/mcp`），可让编码 Agent 直接检索/安装组件。

### 6.2 Pro 站

1. `.env.local` 写入 license key；
2. `components.json` 增加 `registries`：`@reactbits-starter`（Starter 及以上，组件 + setup skill）、`@reactbits-pro`（Pro/Ultimate，blocks/App UI/Agent Kit）；
3. `npx shadcn@latest add <registry>:<item>`，组件后缀 `-tw` / `-css`；
4. 前置：Node 18+、已 `npx shadcn@latest init`、存在 `components.json`；
5. 另有 Landing Builder（Beta）导出、Agent Kit（SKILL.md/prompt/recipe）与 MCP。

### 6.3 实际依赖（免费站 registry 中出现的 npm 包）

| 依赖 | 版本 | 用于 |
| --- | --- | --- |
| `gsap` | ^3.13.0 | SplitText、ScrollFloat、ScrollReveal、AnimatedContent、TextType、MaskedHeading、FoldText、StrokeText、Scramble、TextLoop、BubbleMenu、AccordionGallery、StaggeredMenu、ImageTrail、Shuffle 等 |
| `@gsap/react` | ^2.1.2 | 少数 GSAP 组件的 `useGSAP` 封装 |
| `motion` | ^12.23.12 | BlurText、CircularText、RotatingText、CountUp、TrueFocus、ScrollVelocity、DecryptedText、Stack、FlipCard、SwipeRow、JellyRadio、SpringCheck、SlideCommit 等微交互 |
| `three` | ^0.180.0（部分配 `@react-three/fiber@^9.3.0`、`@react-three/drei@^10.7.4`） | BlobCursor、Lanyard、ModelViewer、Hyperspeed、ColorBends、PaperCrumple |
| `ogl` | ^1.0.11 | WarpText、RippleDistortion、CrystalizedBall、DitherVeil、PatternWaves、MicroSlats、MorphSlider、FlexCarousel、ElectricLogo |
| `matter-js` | ^0.20.0 | FallingText、FolderFloat |
| `vgpu` | ^0.3.1 | ShapeWaves、AeroShards（WebGPU） |
| `@use-gesture/react` | ^10.2.27 | 手势类（拖拽/滑动） |
| `@hugeicons/react` + `core-free-icons` | ^1.1.10 / ^4.3.3 | 微交互中的图标 |

---

## 7. 许可证

### 7.1 免费站：MIT + Commons Clause License Condition v1.0

- 版权：Copyright (c) 2026 David Haz。
- **允许**：商用、修改、合并、随你的 application / website / product 分发；无需署名（但需保留版权与许可声明）。
- **禁止**：**出售、再授权、再分发"组件本身"——单独、打包、或以移植版（ported version）形式**；同样禁止转售工具（Background Studio / Texture Lab / Shape Magic / Center Stage / Sound Lab）与音效库，或把工具做成托管服务。
- 用工具导出的素材（代码/图/视频/音频）可用于任意商用产品，但**不能把这些导出物本身当商品卖**（如音效包、贴图包、背景包、模板包）。
- 无担保。

### 7.2 Pro 站：商业授权（单开发者）

- 付费层级：Starter $129（230 组件）/ Pro $249（+300 blocks + 300 App UI + Agent Kit + Builder）/ Ultimate $349（+15 模板 + 优先支持）；一次性买断，含后续更新；年付订阅亦可得。
- **允许**：在自己或客户的项目里使用、修改；Output 归 Licensee；可用于 SaaS 产品的界面；可用 AI 编码助手辅助。
- **禁止**（License Agreement §2.4/2.5）：
  - 再分发、转售、共享、再授权产品或其"实质部分"（含修改版、片段），**包括放进开源仓库、公开 gist、pastebin、starter kit、boilerplate**；
  - 在公开论坛/社群张贴产品或完整源码，发布展示完整源码的视频/文章；
  - 做成模板包、UI Kit、组件库、Block 库、prompt 包、skill 库、Agent 市场条目、课程，或让用户可浏览/下载/生成的 SaaS；
  - 自建 endpoint 代理/镜像/包装 React Bits Pro registry；
  - 共享 license key / registry 凭据；
  - 作为训练数据、微调/蒸馏/评测数据，或放进对无授权方开放的索引/检索系统；
  - 去除版权与授权元数据、绕过授权机制。
- 监控：registry 请求会记录 key、邮箱、资源、时间、IP、UA、粗略位置；可限流/吊销。
- 一位开发者一个 license，不可自由转让。

### 7.3 对本项目（移植进插件）的含义

| 场景 | 免费站 | Pro |
| --- | --- | --- |
| 在自己的产品 UI 里用/改这些动效 | ✅ 允许（属于 "as part of an application/product"） | ✅ 允许（Output 归你） |
| 把移植版作为插件的一部分随插件分发 | ⚠️ 边界：若插件是"产品"，属于随产品分发，通常可以；若插件本质是"动效/组件集合"供他人复用，则落入"redistribute as a ported version"的禁止项 | ❌ 明确禁止（片段进入可分发的公开产物风险高） |
| 开源插件仓库包含这些代码 | ⚠️ 免费站：属于再分发组件本身，风险高（Commons Clause 禁止） | ❌ 明确禁止（"including as part of open source repositories"） |
| 内部/闭源插件、不作为组件库售卖 | ✅ 较安全 | ✅ 需有效 license，且不再分发源码 |

> 保守做法：闭源、把动效作为产品体验的一部分（而非可复用资产）时，免费站组件基本可用；要放进公开仓库或对外分发的插件，应**按需自己重写**而不是粘贴源码。

---

## 8. 移植到「React + 内联 SVG 插件」的判断

前提假设：目标运行环境是**内联 SVG**（`<svg>` 里画 UI），没有 HTML 层可用；那么这些组件的关键 API 会失效：`background-clip:text`、`mask-composite`、CSS 3D `preserve-3d`、`<canvas>` 覆盖层、WebGL 上下文。

| 组件 | 能否直接用 | 移植判断与做法 | 工作量 |
| --- | --- | --- | --- |
| **TextType** | 🟡 逻辑可直接用，渲染要换 | 打字状态机（逐字增删、mistakes、loop、pause）与样式无关，可直接复用；把 `<span>` 输出换成 `<tspan>`/`<text>`，光标用 `<rect>`/`<line>` + CSS 闪烁。GSAP 仅用于 fade/blur/rise，可用 CSS `@keyframes` 或 WAAPI 替代。注意 SVG 无自动换行，长文本需自己折行（`getComputedTextLength`）。 | S |
| **ShinyText** | 🔴 必须重写渲染 | SVG 没有 `background-clip:text`。做法：`<text>` 用 `<linearGradient>`（含多段 stop 做 bands）作 `fill`，用 `<animate>` 或 rAF 改 `gradientTransform`/`x1/x2` 实现扫光；`glow` 用 `<filter feGaussianBlur>` 叠一层；角度/带宽/软边/往返/触发方式这些参数逻辑可原样保留（都是数学）。 | M |
| **GradientText** | 🔴 重写（模式三不可行） | 线性扫过、漂移网格 → `<linearGradient>` + 动画 stop 偏移，可行；**conic 扇形在 SVG 无原生渐变**，只能用 `foreignObject` 或不支持。渐变描边可用 `<text stroke="url(#g)">` 近似（比 mask-composite 简单）。 | M |
| **BorderGlow** | 🟡 思路可复用，实现换 | SVG 用 `<rect rx>` + `stroke="url(#grad)"` + `feGaussianBlur` 外发光；"光标角度 / 边缘邻近度"是纯几何计算，可直接搬。若要"边框内侧渐变流动"，再叠一层 `stroke-dasharray` 或 `<animate>` 的 gradientTransform。 | S–M |
| **StarBorder** | 🔴 需换渲染层 | Canvas 2D → SVG：用 `<path>` 描述圆角矩形轮廓，`getPointAtLength()` 取点放星点，`stroke-dasharray/dashoffset` 或 `<circle>` 沿路径移动；星尘用小圆 + 透明度衰减。几何采样逻辑可复用。 | M |
| **ElectricBorder** | 🔴 需换渲染层 | 电弧本质是路径抖动 + 发光；SVG 可用 `<path>` 每帧重算 + `feTurbulence/feDisplacementMap` 近似，或用 `stroke-dasharray` 闪烁。比 Canvas 版更容易掉帧，需限制段数。 | M–L |
| **ClickSpark** | 🔴 需换渲染层 | 火花是纯几何（角度、距离、重力、缓动），逻辑可复用；把 canvas 绘制换成 N 个 `<line>`/`<circle>` + CSS 动画（transform/opacity），或用 `foreignObject` 保留 canvas。注意 `layer: back` 的层叠在 SVG 里靠元素顺序即可。 | S–M |
| **Magnet** | 🟢 基本可直接用 | 纯指针数学 + `transform`，改成对 `<g>` 设置 `transform` 即可；弹簧用手写或 CSS `transition`。 | S |
| **GlareHover** | 🟡 需重写 | CSS mask 光带 → SVG `<rect>` 叠加 `<linearGradient>` 白→透明，随指针方向旋转/位移；混合模式用 `mix-blend-mode` 在 SVG 内支持有限，可用透明度近似。 | S |
| HoldButton / FuseButton / PulseHeart / SloshGauge | 🟡 逻辑可用 | 纯 CSS/状态驱动的进度、液面、脉冲，改成 SVG `<rect>` 高度/`<circle>` 缩放 + 状态机即可。 | S |
| SlingButton / SquishSwitch / SpringCheck / SwipeRow 等 Motion 类 | 🟡 逻辑可用，库要换 | 交互状态与阈值逻辑可复用；`motion` 的 spring 可用 CSS `linear()`/WAAPI 或手写弹簧替代（内联 SVG 场景通常不宜再引 motion）。 | S–M |
| SpecularButton / FlyingButton / GlassSurface / FluidGlass / HoloCard 等 WebGL 类 | 🔴 不可直接移植 | 需要真实 WebGL/Canvas 上下文。要么 `foreignObject` 嵌 `<canvas>`（会引入 HTML 层、样式隔离与性能问题），要么用 SVG 滤镜近似（`feSpecularLighting` + `feTurbulence` + `feDisplacementMap` 做玻璃/折射），效果会明显退化。 | L |
| Backgrounds 着色器类（Aurora / Silk / Galaxy / Particles / Balatro …） | 🔴 不建议移植 | 全部是 fragment shader，SVG 无法承载；只能换成静态渐变/`feTurbulence` 噪声近似，或干脆不用。 | L / 放弃 |
| FallingText / FolderFloat（Matter.js） | 🟡 物理要重写 | 刚体物理可用简化积分（速度+重力+碰撞边界）替代，视觉接近即可。 | M |
| Scroll 驱动类（ScrollFloat / ScrollReveal / AnimatedContent / ScrollStack） | 🟡 可直接改 | IntersectionObserver + transform/opacity，SVG 内同样成立（`<g transform>`），主要改输出元素。 | S |

**总体判断**

- **直接可用（<0.5 天）**：`Magnet`、`TextType`（状态机）、`HoldButton`/`FuseButton` 类状态驱动组件、Scroll 入场类。
- **小改可移植（0.5–1 天/个）**：`ShinyText`、`GradientText`（线性模式）、`BorderGlow`、`GlareHover`、`ClickSpark`、`StarBorder`。
- **需要重写实现（1–3 天/个）**：`ElectricBorder`、`SpecularButton` 级别的着色器按钮、复杂的 3D 卡片。
- **不要移植**：所有 Backgrounds 着色器、Three.js/OGL 类（FluidGlass、Lanyard、ModelViewer、Hyperspeed 等）。
- **许可证前提**：若是闭源插件、动效只作为产品体验的一部分，免费站组件可用；若要开源或把插件当"可复用动效库"分发，需自行重写（Commons Clause 禁止再分发移植版）。Pro 组件不建议进入任何对外分发的产物。

---

## 9. 调研方法与局限

**证据来源**

- 免费站类目与全量组件名：`/c/text-animations`、`/c/animations`、`/c/components`、`/c/micro`、`/c/backgrounds` 侧边栏与列表页。
- 免费站实现技术：`https://reactbits.dev/r/registry.json`（公开 shadcn registry 索引：1274 条 = 218 个组件 × 4 变体（JS/TS × CSS/TW）+ 201 个 `Sound*` 音效条目 × 2 变体）与逐组件 `https://reactbits.dev/r/<Name>-TS-CSS.json` 的**完整源码**，解析 `import` 与 `dependencies` 字段；因此免费站的"实现技术"列是**基于真实源码**，不是猜测。
- Pro 站：`/docs/components` 及 230 个子页面（名称、描述、Props），`/docs/introduction`、`/docs/installation`、首页定价、`/license`。
- 许可证：`https://raw.githubusercontent.com/DavidHDev/react-bits/main/LICENSE.md`（MIT + Commons Clause v1.0）。

**局限**

1. **Pro 组件源码不公开**：`/r/*` 返回 404，组件页 `Code` 被替换为付费墙。因此 Pro 的"实现技术"只做了类目级判断（3D & Shaders = 着色器类；Text 多为 DOM/Canvas/Motion），**未逐组件验证**。
2. 免费站 registry 里另有 **201 个 `Sound*`（音效）条目**（402 条记录）与 1 个未进入五个类目侧边栏的组件 `EvilEye`，均未纳入本清单；`Sound*` 可能是新栏目或工具产物。
3. 组件数量口径存在站点与 README 不一致（Micro 34/35、总数 216/217），本报告以站点侧边栏为准。
4. 技术判定中，少数组件同时含 `canvas.getContext('2d')`（用于取色/量宽）与 CSS 实现，已按主导实现归类（如 `ShinyText` 归 CSS、`StarBorder` 归 Canvas）。
5. Pro 页面中 `spectral-clouds`、`elastic-reel`、`gradient-blob`、`helix-gallery` 抓取超时，描述留空并已标注。

**主要链接**

- 免费站：<https://reactbits.dev/>　安装：<https://reactbits.dev/get-started/installation>　MCP：<https://reactbits.dev/get-started/mcp>
- Pro 站：<https://pro.reactbits.dev/docs/components>　安装：<https://pro.reactbits.dev/docs/installation>　许可：<https://pro.reactbits.dev/license>
- 仓库：<https://github.com/DavidHDev/react-bits>　许可证：<https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md>
