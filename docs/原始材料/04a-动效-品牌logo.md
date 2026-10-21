# 04a · 动效规格：品牌 logo（P0）

| 项 | 值 |
| --- | --- |
| 效果名 | `lumina.brand` |
| Tier | 1（slot） |
| 稳定性 | ★★★★★ |
| 阶段 | P0（最优先） |
| 可并行 | 是（与 04b/04c/04d 无依赖） |
| 图形资产 | `assets/deepseek-harness-logo-v2.svg` |

---

## 1. 视觉目标

本文件描述的**机制**（内联 SVG + `<mask>` 提亮 + 渐变 + 平移）由所有品牌预设共用；**图形与配色**由 `brand` 配置决定。见 [04 §4.4 品牌预设](04-动效规格总览.md)。

### 1.1 预设 `deepseek`（已有资产，机制参考实现）

| 元素 | 规格 |
| --- | --- |
| 鲸鱼图标 | 纯色 `var(--lumina-brand)` = `#FF3B30` |
| 字标 "deepseek" | 沿 x 方向：`#12100F` → `#8C1D12` → `#FF5C48` → `#8C1D12` → `#12100F`（深→浅→深） |
| 流光 | 一条亮带每 3.6s 从左扫到右，只提亮笔画 |
| HARNESS 徽标 | 深底白字；深色模式下自动翻转为白底深字 |

### 1.2 预设 `ratel`（默认，图形待设计）

| 元素 | 规格 |
| --- | --- |
| 蜜獾标识 | `var(--lumina-brand)` = `#2563EB`（Ratel `colorPrimary`） |
| 字标 "Ratel" | 深→浅→深同款处理：`var(--lumina-edge)` → `var(--lumina-brand-deep)` → `var(--lumina-brand-soft)` → 回溯 |
| 流光 | 同机制，3.6s |
| 引擎徽标 | 建议保留 `HARNESS` 徽标，表达"Ratel 构建于 Harness 之上" |

⚠️ **Ratel 图形尚未设计**（仓库无任何 logo 资产）。在图形完成前，可先用文字字标 "Ratel" + 品牌色块占位，机制照跑。见 [07](07-风险与降级策略.md) R15。

### 1.3 视觉验证基准（`deepseek` 预设）

实测参考：字标沿文字亮度 **17 → 159 → 17**；流光扫过处纯白像素数应为 **0**（材质是"提亮笔画"而非"盖白块"）。

参考截图：`assets/reference-client-v2.png`（客户端实拍）、`assets/reference-shine-frames.png`（流光三帧）。

## 2. 落点

占据三个 slot：

| slot | 渲染内容 |
| --- | --- |
| `sidebar.brand.mark` | 鲸鱼图标（24px 见方，收起态也用这个） |
| `sidebar.brand.name` | 字标 + HARNESS 徽标（展开态） |
| `conversation.hero.brand.mark` | 新会话首屏图标（34px 左右） |

三个都用 `priority: -20`（压过 `dsh-brand-studio` 的 `-10`，见 [02 §2.1](02-平台约束（执行前必读）.md)）。

两个预设占据**同样的三个 slot**，切换预设不改变 slot 拓扑，只换图标与配色——这也是"包名不带品牌"能成立的技术原因（见[产品需求 §1](../product/产品需求.md)）。

## 3. 关键实现约束（踩过的坑，勿重犯）

### ① 必须内联 SVG，不能用 `<img>`

`<img src="*.svg">` 是独立文档，**外层无法影响其内部动画**，而且 CSS 动画虽然在部分浏览器会跑，但无法与页面主题联动。必须把 SVG 作为 React 元素内联进 DOM。

### ② 流光用 `<mask>`，不能用 `clip-path` + 白块

错误做法（会把背景一起刷白）：

```html
<g clip-path="url(#wordClip)"><rect fill="white" .../></g>
```

正确做法——把**字形自身**重新填成高光渐变，页面背景完全不受影响：

```html
<mask id="wordMask">
  <!-- 直接展开 path 数据，不用 <use> -->
  <path d="..."/><path d="..."/>
</mask>
<g mask="url(#wordMask)">
  <g class="lumina-shine">
    <rect x="..." y="22" width="96" height="56" fill="url(#shineBand)"/>
  </g>
</g>
```

实测差异：用 clip 方案扫过处纯白像素 17 个（字几乎消失）；改用 mask 后为 0，字始终可读。

### ③ `<use>` 在 `<clipPath>` / `<mask>` 内不生效

rsvg 与 Chrome **都会丢弃**这种引用。必须重复展开 path 数据（宁可文件大一点）。

### ④ 渐变用 `objectBoundingBox`，不要 `userSpaceOnUse`

`userSpaceOnUse` 的坐标系与矩形错位时，整条光带会变成全透明（渐变早就在矩形之外结束了）。用 `objectBoundingBox` 让渐变自动贴合矩形，光带无论停在哪都正确。

### ⑤ 保留减少动态分支

```css
@media (prefers-reduced-motion: reduce) {
  .lumina-shine { animation: none; }
}
```

### ⑥ 深色模式用 CSS 变量，别写两套 SVG

字标两端用 `var(--lumina-edge, #12100F)`，在 `prefers-color-scheme: dark` 下把变量改成 `#F4F1F0`。徽标同理（底色与字色互换）。

> 注意：用 CSS 变量 + class 规则，**不要**把 `var()` 直接写在 `fill` 属性上却又不给兜底值——变量取不到时会回落到 `inherit`，而根 `<svg fill="none">` 会让整张图变透明。

## 3.7 参考组件与许可

reactbits 免费站里视觉最接近的是：

- `ShinyText` —— 光带扫过文字（纯 CSS `background-clip:text`，JS 按帧推进光带）
- `GradientText` —— 文字内部活渐变（线性扫过 / 漂移网格 / 锥形摆动三模式）
- `StrokeText` —— 描边自绘后填充

**我们未使用其源码。** 本效果用内联 SVG + `<mask>` + `linearGradient` 自行实现，机制与上述组件不同——它们基于 DOM 文本的 `background-clip:text`，而 SVG 里没有这个属性（这也是我们必须换实现路径的原因）。

许可约束见 [改编与许可政策](../../THIRD_PARTY_NOTICES.md)。

---

## 4. 参考实现

### 4.1 slot 注册（含失败兜底）

```js
function registerBrand(ctx) {
  var slots = ["sidebar.brand.mark", "conversation.hero.brand.mark", "sidebar.brand.name"];
  var offs = [];

  slots.forEach(function (slot) {
    ctx.slots.inject(slot, function () {
      var release;
      try {
        release = ctx.slots.register(
          { name: slot, priority: -20 },
          slot === "sidebar.brand.name" ? BrandName : BrandMark
        );
      } catch (error) {
        console.warn("[dsh-lumina] cannot occupy " + slot, error);
      }
      return function () { release?.(); };
    });
  });

  return function () { offs.forEach(function (f) { f(); }); };
}
```

### 4.2 组件结构

```js
function BrandMark(props) {
  var size = props.size || 24;
  // viewBox 裁到鲸鱼：x 28..80, y 29..70（对应 476×98 画布）
  return jsx("span", {
    className: "lumina-mark",
    style: { display: "inline-flex", width: size, height: size, flexShrink: 0 },
    "aria-hidden": "true",
    children: jsx("svg", {
      viewBox: "28 29 52 41", width: size, height: size,
      xmlns: "http://www.w3.org/2000/svg",
      children: [whaleDefs(), whalePath()],
    }),
  });
}

function BrandName() {
  // 名称槽无 size prop，用 CSS 控制高度自适应
  return jsx("span", {
    className: "lumina-name",
    children: jsx("svg", {
      viewBox: "103 28 306 44",   // 字标 + 徽标
      className: "lumina-name-svg",
      xmlns: "http://www.w3.org/2000/svg",
      children: [nameDefs(), wordPaths(), shine(), badge()],
    }),
  });
}
```

`lumina-name-svg` 的尺寸约束（名称槽高度 24px）：

```css
.lumina-name { display: inline-flex; align-items: center; min-width: 0; height: 24px; overflow: hidden; }
.lumina-name-svg { height: 100%; width: auto; display: block; }
```

### 4.3 流光的 CSS

```css
.lumina-shine { animation: lumina-sweep 3.6s cubic-bezier(.45,0,.55,1) infinite; }

@keyframes lumina-sweep {
  from { transform: translateX(-100px); }
  to   { transform: translateX(392px); }
}

@media (prefers-reduced-motion: reduce) {
  .lumina-shine { animation: none; }
}
```

### 4.4 深色模式

```css
@media (prefers-color-scheme: dark) {
  :root { --lumina-edge: #F4F1F0; }
  .lumina-badge-fill { fill: #F4F1F0; }
  .lumina-badge-text { fill: #16181D; }
}
```

## 5. 与 `dsh-brand-studio` 的关系

| 项 | 处理 |
| --- | --- |
| 品牌 slot | Lumina 用 `-20` 稳定胜出 |
| 字标/徽标 | 由 Lumina 的 `sidebar.brand.name` 一并渲染，避免两套字标叠在一起 |
| 标题定制 | 仍由 brand-studio 提供（它监听 `document.title`） |
| 设置面板 | brand-studio 的「品牌」面板会让 logo/字标设置失效（因为 slot 被抢了）。**README 必须说明二选一** |

可选增强：Lumina 自行读取 brand-studio 的 localStorage 配置，若用户在其中设了自定义 logo，则 Lumina 主动让位（不注册 `sidebar.brand.mark`）。这样两个插件的语义就不冲突了。**建议 P3 再实现**。

## 6. 验收标准

每项都要有实际证据。

- [ ] 侧栏展开态：`sidebar.brand.mark` 容器内是 `<svg>` 元素，**不是** `<img>`
- [ ] 侧栏收起态（56px 轨道）：同样渲染内联 SVG
- [ ] 新会话首屏：hero 图标显示内联 SVG
- [ ] 连续 6 次采样（间隔 ≥400ms）`.lumina-shine` 的 `getBoundingClientRect().x` 互不相同
- [ ] 两帧截图的字形区域差异非零
- [ ] 浅色主题：字标两端计算值为 `#12100F`；深色主题：`#F4F1F0`
- [ ] 两种主题下字标与背景对比度均 ≥4.5:1
- [ ] 系统开启「减少动态效果」后，`.lumina-shine` 的 `animation-name` 为 `none`
- [ ] 流光扫过处纯白像素数为 0（不是"盖白块"）
- [ ] 卸载插件并重启后，客户端回落到官方鱼形标志，DOM 中无 `.lumina-*` 残留
- [ ] 与 `dsh-brand-studio` 同时安装时，品牌区**不出现双重字标**

## 7. 未确定项

- 名称槽在极窄侧栏（折叠前约 56–80px）下，字标是否该隐藏、只留图标？需实测定一个断点。
- Windows 桌面端 `prefers-color-scheme` 是否跟随系统，需实测；若不跟随，改用 `[data-ds-theme]` 属性选择器兜底。
