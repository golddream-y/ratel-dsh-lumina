# 05 · reactbits 对照与许可

用户希望借鉴 [reactbits.dev](https://reactbits.dev) 的动效质感。本文件说明三件事：

1. 这个库到底是什么（**它其实是两条产品线，不是免费/付费分层**）
2. **许可证是硬约束**——它明确禁止再分发"包括移植版"，这直接决定了我们的做法
3. 我们采用什么、不采用什么、以及为什么

> 附录：[08-reactbits组件目录（调研）](08-reactbits组件目录（调研）.md) 含 217 个免费组件与 230 个 Pro 组件的逐条清单。
> ⚠️ 该目录是**内部研究产物**，含对其实现技术的描述，**不得随插件源码或发布物分发**。

---

## 5.1 关键认知：两条产品线

这是最容易搞错的一点。**Pro 不是"免费版的付费解锁"，而是一个独立站点、独立的组件体系。**

| | 免费站 reactbits.dev | Pro 站 pro.reactbits.dev |
| --- | --- | --- |
| 组件数 | **217** | **230**（另加 300 marketing blocks、300 App UI blocks、15 模板） |
| 类目 | Text Animations 33 · Animations 38 · Components 48 · Micro Interactions 35 · Backgrounds 63 | Text 34 · Backgrounds 98 · 3D & Shaders 49 · Cursor Effects 21 · UI & Cards 28 |
| 源码 | 全部公开（shadcn registry） | **付费墙**，`/r/*` 返回 404 |
| 授权 | MIT + Commons Clause | $129 / $249 / $349，单开发者商业授权 |

两站有少量重名（`Particle Text`、`Glitch Text`、`Animated List`…），但**实现不同，不是同一批组件**。

### 对我们的实际影响

**四个需求点全部落在免费站**，Pro 只提供变体（如 `Ghost Type` 是 AI 补全式打字）。所以本方案**完全不需要 Pro**，不涉及付费授权问题。

---

## 5.2 技术实现（217 个免费组件已逐个拉源码验证）

不是靠描述推断，是从 registry 逐个取源码解析 import 得到的统计：

| 技术 | 数量 | 典型分布 |
| --- | --- | --- |
| 原生 WebGL 着色器 | **86** | Backgrounds 63 个里 55 个是手写 fragment shader |
| CSS / DOM | ~51 | Text 9、Components 23 |
| Motion (Framer Motion) | 26 | Micro Interactions 19 为主 |
| GSAP | 16 | Text 9 为主（`SplitText`、`TextType`、`MaskedHeading`） |
| OGL | 9 | |
| Three.js | 4 | 注意：Backgrounds 里 Three 只占 2 |
| Matter.js | 2 | |
| WebGPU (vgpu) | 2 | |
| Canvas 2D | ~16 | `StarBorder`、`ClickSpark`、`ElectricBorder` |

**这个分布直接决定了移植策略**：近 40% 是 WebGL，SVG 根本承载不了。见 §5.5。

---

## 5.3 四个需求点的对应组件（名字要准）

| 我们的需求 | 免费站组件 | 实现技术 | Pro 的变体 |
| --- | --- | --- | --- |
| 打字机 | **`TextType`** | React 状态机 + GSAP 时间线 + CSS 光标；props: `typingSpeed` / `deletingSpeed` / `loop` / `cursorStyle` / `mistakes` / `typeEffect` | `Ghost Type`（AI 补全式）、`Cipher Reveal`、`Glyph Lottery` |
| 文字流光 | **`ShinyText`**、**`GradientText`**、`GlareHover` | `ShinyText` 纯 CSS `background-clip:text`，JS 只按帧推进光带（有 bands / glow / angle / followPointer）；`GradientText` 三模式：线性扫过 / 漂移网格 / 锥形摆动 | `Luminous Type` |
| 边框流光 | **`BorderGlow`**、`StarBorder`、`ElectricBorder` | `BorderGlow`：CSS mask + 多层渐变 + `--edge-proximity` / `--cursor-angle` 由指针驱动；`StarBorder`：Canvas 2D 沿精确轮廓；`ElectricBorder`：Canvas 2D 电弧 | `Frame Border` |
| 按钮点击 | **`ClickSpark`**、`Magnet`、`SpecularButton` | `ClickSpark`：Canvas 2D 火花迸射，支持 ring 扩散环、`layer:'back'` 让火花溢出按钮外、`ref.spark(x,y)` 程序触发；`Magnet`：磁吸，手写弹簧；`SpecularButton`：WebGL 玻璃 | — |

### 三个必须记住的"不存在"

1. **没有叫 `Typewriter` 的组件。** 打字机是 `TextType`。
2. **没有 Material ripple 按钮。** ripple 语义只出现在 `RippleDistortion`（图片水波）和 Pro 的 `Minimal Ripple`（背景）里。
3. **没有叫 `Glowing Border` 的组件。** 边框流光最接近的是 `BorderGlow`。

> 这三条我早期文档里写错过，已修正。派活时务必用准确名字，否则执行方会去搜一个不存在的组件。

---

## 5.4 许可证：这是本方案最硬的约束

### 免费站：MIT + Commons Clause v1.0

准确表述：

| 场景 | 是否允许 |
| --- | --- |
| 商用、修改、随产品分发 | ✅ |
| 把动效作为你自己产品体验的一部分（闭源插件） | ✅ 基本可用 |
| **再分发组件本身** | ❌ **明确禁止** |
| **再分发"移植版（ported version）"** | ❌ **明确禁止** |
| 出售 / 再授权组件 | ❌ |
| 工具与音效同样受限 | ❌ |

**关键点：许可原文点名了 "ported version"。**

这意味着"我看懂了它的实现，然后换个技术栈重写一遍，再分发出去"——**在法律上仍可能被认定为移植版**。这不是"自己重写就没事"的问题。

### 对本方案的决定性影响

`dsh-lumina` 的定位恰恰是**"可复用的动效增强层"**，而且大概率会开源分发。这正好落在 Commons Clause 的禁止区。

因此本方案的规则是：

> **不复制、不直译、不逐行对照其源码实现。只从其"效果名称与视觉行为"层面确认需求，用 Web 平台原语自行设计实现。**

具体到执行：

| 做法 | 判定 |
| --- | --- |
| 读它的组件描述/预览，知道"有光带扫过文字"这回事 | ✅ |
| 打开它的源码，逐行翻译成我们的代码 | ❌ 移植版 |
| 用 CSS `conic-gradient` + `mask-composite` 自己设计一圈边框光 | ✅ 平台原语，通用技术，非其发明 |
| 用内联 SVG `<mask>` 提亮笔画做流光 | ✅ 同上（且我们踩过的 `<use>` 坑、`objectBoundingBox` 坑都是自己实测的） |
| 把 `08` 那份目录（含其技术描述）打进插件包 | ❌ 不要 |

**为什么我们的实现不构成移植**：`conic-gradient` 边框、`mask` 提亮、`opacity` 呼吸光标、`:active` 缩放，这些都是 CSS/SVG 规范里就有的通用原语。reactbits 并未"发明"它们，我们也没有复制其参数、结构与代码组织。

### Pro：更严

单开发者授权；**禁止**再分发、禁止片段进公开仓库/gist/starter kit、禁止做成 UI Kit/组件库/模板包/课程、禁止代理 registry、禁止作训练数据、禁止共享 key。

结论：**Pro 组件不要进入任何对外分发产物。** 本方案不需要 Pro。

---

## 5.5 移植判断（基于 217 个组件的真实技术栈）

| 分类 | 组件 | 判断 |
| --- | --- | --- |
| **可直接借鉴思路** | `Magnet`、`TextType` 的打字状态机、状态驱动的 `HoldButton` / `FuseButton`、Scroll 入场类 | IntersectionObserver + transform，平台原生能力 |
| **需自行重写（逻辑可参考，代码不搬）** | `ShinyText` → SVG 无 `background-clip:text`，改用 `<text fill="url(#grad)">` + 动 `gradientTransform`；`GradientText` → **conic 模式 SVG 不支持**；`BorderGlow` → `<rect stroke="url(#g)">`；`ClickSpark` → 火花几何换 SVG 图元；`StarBorder` → path + `getPointAtLength` + `dashoffset` | 半天级 |
| **不移植** | 全部 WebGL / 着色器类（Backgrounds 几乎全部、`SpecularButton`、`FluidGlass`、`HoloCard`…） | SVG 承载不了 WebGL；`foreignObject` 嵌 canvas 会引入 HTML 层与样式隔离问题，效果还明显退化 |

### 本方案的实际选择

我们**一个都没搬**。四个效果全部用平台原语自行实现：

| 效果 | 我们的实现 | 是否与 reactbits 源码有任何对应 |
| --- | --- | --- |
| 品牌流光字标 | 内联 SVG + `<mask>` + `linearGradient` + `translateX` keyframes | 无 |
| 边框流光 | `conic-gradient` + `@property` 角度插值 + `mask-composite` | 无（`BorderGlow` 用的是指针驱动的 CSS 变量，机制不同） |
| 光标呼吸 | `opacity` keyframes on `[data-lexical-cursor]` | 无 |
| 按钮按压 | `:active` + `transform` / `filter` | 无（`ClickSpark` 是 Canvas 火花，机制完全不同） |
| 首屏入场 | 内联 SVG + `blur` / `scale` / `opacity` 入场 | 无 |

**这就是为什么我们的依赖清单是零**：不是"为了零依赖而零依赖"，而是自行实现本来就更贴合 DSH 的 Slot 与 `data-*` 钩子。

---

## 5.6 为什么明确不做 WebGL 背景

| 考量 | 说明 |
| --- | --- |
| 位置不对 | 背景粒子属于 landing page；DSH 侧栏与输入区是高频交互区 |
| 启动成本 | WebGL 上下文初始化占 GPU 时间，Electron 里可能触发合成层抖动 |
| 掉帧风险 | 与消息流式渲染抢 GPU |
| 包体 | three.js 压缩后数百 KB |
| 耗电 | 常驻渲染对笔记本不友好 |
| 收益有限 | 用户真正感知的是品牌、输入框、光标这些细节 |

**结论：不做。** 若未来确有需要，应作为独立可选插件，不塞进 Lumina 主包。

---

## 5.7 相关链接

- 免费站：[reactbits.dev](https://reactbits.dev)
- Text Animations：[reactbits.dev/c/text-animations](https://reactbits.dev/c/text-animations)
- `ShinyText`：[reactbits.dev/text-animations/shiny-text](https://reactbits.dev/text-animations/shiny-text)
- 源码仓库：[github.com/DavidHDev/react-bits](https://github.com/DavidHDev/react-bits)
- Pro 站：[pro.reactbits.dev](https://pro.reactbits.dev)
