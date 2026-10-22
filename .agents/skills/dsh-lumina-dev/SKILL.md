---
name: dsh-lumina-dev
description: 开发和修改 Ratel Lumina（@ratel-works/dsh-lumina，DSH 客户端动效增强层）时必须遵守的工程约束。涵盖 slot 注册契约、priority 语义、模块表 require 边界、CSS 变量与主题 token、减少动态、性能预算、验收证据要求与文档同步规则。在修改 src/ 下的任何文件、注册或调整 slot、编写动效 CSS、扩展效果、或新增/修改测试前加载。
---

# Ratel Lumina 开发约束

## 0. 命名

- npm 包 / client module id：`@ratel-works/dsh-lumina`
- 产品名：**Ratel Lumina**；UI 短名：**Lumina**
- host patch 行：`include:ui-lumina`（id `ui-lumina`）
- 设置 section id：`ratel-lumina`；样式标记：`data-plugin="ratel-lumina"`
- 改包名时，`tsdown.config.ts` 的 `PACKAGE_ID`、`cordis.patch.yml` 的 `name`、profile 安装 spec 必须同步；client factory id 必须等于包名。


本项目是 **DeepSeek Harness 客户端的动效增强层**：一个 npm 包 `@ratel-works/dsh-lumina`，产品名 **Ratel Lumina**（UI 短名 Lumina），
以 profile bundle 的形式占据官方 UI slot 并注入 CSS 动效。

**先读**：`docs/engineering/官方API面.md`（平台硬约束与已验证 API）、
`docs/engineering/技术详细设计.md`（L0–L4 实现契约、测试门禁）、
`docs/engineering/工程规划.md`（工程形态与工具链）、
`docs/product/MVP.md`（当前交付范围、改编清单与实施顺序）。

---

## 1. 三条不可违反的硬约束

1. **不改 `app.asar`**——它被代码签名逐字节封印，改一字节即破签、macOS 拒绝启动。
   所有实现必须在插件层完成。
2. **不用 hash 类名做选择器**——客户端类名形如 `_3WPZCG_brandName`，每次构建都变。
   只用 `data-*` 钩子与官方 slot；`[class*="…"]` 一律禁止，不要新增同类选择器。
3. **不碰业务逻辑**——动效不承载信息；关掉后功能与含义完全不变。
   不监听模型输出内容、不改请求、不写业务状态。

## 1.1 生效方式：设置热生效，代码要重启

- **设置改动立刻生效**：设置页保存走 `store.commit`，客户端 `store.subscribe(render)` 会
  重新安装全部效果（`disposeEffects()` → `installEffects(config)`）。所以切换发送转场模式、
  品牌预设、强度档位、任何开关都**不需要重启客户端**，当场就能看到效果，适合现场对比。
- **代码改动必须重启**：client bundle 在客户端启动时加载。改了 `src/` 里的代码后，
  重新构建并安装只是更新了 profile 里的文件，**当前页面仍然跑旧 bundle**，必须完整退出
  客户端再打开才会生效。清理 Electron 的 `Cache` / `Code Cache` 能避免旧页面缓存。

排查顺序：先确认现象属于"设置"还是"代码"；设置类问题直接改设置验证，代码类问题先重启再看。

## 2. Slot 注册契约

```js
ctx.slots.inject(slotKey, () => {
  let release
  try {
    release = ctx.slots.register({ name: slotKey, priority: -20 }, Component)
  } catch (error) {
    console.warn('[ratel-lumina] cannot occupy slot', error)
  }
  return () => { release?.() }   // 卸载必须 release
})
```

- **`priority` 在 bundle 路径按传入值生效**：升序排列，**最小者渲染**。
  Lumina 的品牌 slot 用 `-20` 压过 `dsh-brand-studio` 的 `-10`。
  官方 slot 目录里「不要传 priority」那条说的是**动态插件路径**，不适用于本项目。
- **同 priority 的两个占用者会抛异常**，不是「后注册者胜」。
  换 priority 之前先确认没有别人用同一个值。
- `list` slot 必须给 `id`；`chain` 必须给 `select`。
- `settings.section` 还需 `order` / `locale`（命名空间）/ `label`（本地化 thunk）。
- **消费者注册进别人的 slot 时不得声明 `children`**——`children` 是 slot **所有者**
  用来声明子 slot 的。我们的单 slot 占据不需要 `children`。
- 注册进**未声明**的 slot 会抛异常——slot 只在声明它的宿主挂载时存在。

## 2.1 设置页落点（当前唯一可用通道）

设置页注册进 **`settings.section`**（list 槽）——设置导航中的一个独立页面。

**不要改成官方的 `settings.plugin.item` 卡片通道**，除非客户端已经提供它：

| 符号 | 已安装客户端 0.2.1-rc.2 |
| --- | --- |
| `installSettingsSection` / `settingsNamespace` | 不存在 |
| `settingsScope` | 不存在 |
| `settings.plugin.item` | 不存在 |

走那条路会让 `ctx.slots.inject('settings.plugin.item', …)` 等待一个**永不出现的声明**，
卡片静默不渲染。判定方法：`grep -c "settings.plugin.item" app.asar`。
迁移步骤见 [设置页设计](../../../docs/engineering/设置页设计.md) §1。

设置项持久化自持于 `localStorage["ratel-lumina/settings/v1"]`（旧 `dsh-lumina/settings/v1` 仍兼容读取）；模型是扁平字段
（字段集合见技术详细设计 §7.1），迁移到官方通道时不需要改数据结构。

## 3. 运行时边界

- 浏览器半**不能 `import`**，只有工厂收到的 `require`。本项目只允许 require
  `react` / `react/jsx-runtime`（确需 React DOM 时再加 react-dom）。
  **不得 require 任何 `@deepseek-ai/*` Harness Client 包**（包括 primitives）：
  当前客户端规范明确禁止；`dsh.client.inject` 只负责激活排序，不是可 require 的依赖。
  模块表里存在的 specifier 不代表第三方可用。
  **请求表外的 specifier = 当场 throw**（require 是同步的）。
- 工厂必须 `return module.exports`。返回 `module` 会让插件**永不物化、零报错**。
- `ctx.effect(callback)` **立即执行 callback**，并收集它返回的 disposer。必须写
  `ctx.effect(() => () => teardown)`；把 teardown 本身当 callback 传入，会在
  apply 阶段立刻卸载 slot/样式/根属性，表现为“设置页和效果都没有”。
- slot 注册统一走 `occupySlot`：先直接 `register`，slot 尚未声明时再 `inject`；
  不要在效果里自己写 try/catch 或重复注册。
- bundle 路径**没有 `styles.insert`**——那是动态插件的座位。自建 `<style>` 标签，
  带 `data-plugin="ratel-lumina"` 与 `data-effect="<effectId>"`。
- 组件不得接触 `ctx`；数据只经 props 传递。`ctx` 只属于 apply 世界。

## 4. 样式与主题

- **不写死颜色**。用官方语义 token（`var(--dsw-alias-label-primary)` 等）或本插件的
  `--lumina-*` 变量。深浅色由 `--dsw-*` 自动跟随，
  **不要写主题选择器**（`prefers-color-scheme` / `[data-ds-dark-theme]`）——
  官方明文要求功能包 CSS 里不放主题选择器（`docs/web-styling.md`）。
  唯一允许的媒体查询是 `prefers-reduced-motion`（动效查询，无障碍底线）。
- 本插件的品牌色由 `brand` 配置项驱动，**所有效果只消费变量**，不硬编码红/蓝。
  切预设后品牌区与全部效果必须同步变色。
- 自建 `<style>` 是**第三方插件的固有机制**：我们不在官方仓库内，无法向 `ui-theme`
  的全局表加样式；且要样式的是别人拥有的 DOM，CSS Modules 对其无效。
  补偿：每个效果独立标签（`data-plugin` + `data-effect`），卸载即摘除；
  所有选择器作用域化在 `data-*` 上。
- 装饰层一律 `position: absolute` + `pointer-events: none`，永不阻挡点击/输入/拖拽/选中。
- 默认只动 `transform` / `opacity`，不碰 `width` / `height` / `top` / `left`；
  例外以技术详细设计 §6.6.1 为准，且不得触发 layout。
- 效果清单、动画分类、逐效果时长、伪元素分配以
  [技术详细设计](../../../docs/engineering/技术详细设计.md) 为准；本 Skill 不复述这些数字。

## 5. 减少动态（无障碍底线）

每个效果**必须**自己实现 `prefers-reduced-motion` 分支，且**不得**提供关闭该跟随的选项。
媒体查询里必须覆盖 `::before` / `::after`，否则伪元素上的动画不会停。
光标类效果的最低透明度不得低于 0.35；减少动态时必须常亮不闪。

## 6. 失败隔离

每个效果在自己的 `try/catch` 里初始化，走 `core/registry.ts` 的 `runEffects`。
一个效果崩了，其余必须照常工作；且失败时不得留下空壳样式或占位元素。

## 7. 验收证据（不可用「代码看起来对」代替）

| 类型 | 要求 |
| --- | --- |
| 装载 | `window.__DSH_BOOT__.entries` 含 `@ratel-works/dsh-lumina`；控制台无 `cannot occupy` / `effect failed` |
| DOM | 关键断言的实际返回值（贴输出） |
| 动效 | **两次以上采样**的 `getComputedStyle` / `getBoundingClientRect`，证明在变 |
| 无障碍 | `matchMedia` 与 `animation-name` 的实际值 |
| 视觉 | 开关前后对比截图（截图**不能**作为动效唯一证据） |

截图有绘制时序问题，`Page.captureScreenshot` 可能早于动画绘制。断言 DOM 与计算样式优先。

## 8. 提交前

```sh
npm run typecheck
npm run build
npm test
npm run install:local web   # 装进 profile；改完源码必须重装（file: 安装是拷贝不是软链）
```

客户端**只在启动时**读插件清单，**无热更新** → 改完必须重启客户端。

升级客户端后跑 `node tools/verify-hooks.mjs`（在客户端控制台执行）复测 `data-*` 钩子；
钩子消失是**静默降级**，不会报错。

## 9. 文档同步

- 设计变更 → 先改 `docs/product/MVP.md`（范围/效果）或 `docs/engineering/` 对应文档，再改代码。
- 决策与理由 → 写 `.agents/notes/{proposed,implemented,rejected}/<class>/yyyy-mm-dd-<topic>.md`。
  `implemented` 必含 `## Alternatives considered`。
- 与官方事实冲突的假设 → 写进 `.agents/notes/` 决策记录，并同步修正现行文档。

## 10. 许可与代码归属

- **允许**改编 reactbits 等外部项目的代码，但必须同时满足：
  1. 保留原文件的版权头与许可声明，**不删不改**
  2. 在 `THIRD_PARTY_NOTICES.md` 登记：本仓库文件、来源项目、来源文件、许可、随附条款
  3. 若上游许可含 Commons Clause，**不得**把该组件单独售卖，也不得声称"独立原创"
- **禁止**为改编引入第三方运行时（`motion` / `gsap` / `three`）。上游组件若依赖它们，
  只取思路、用平台原语重写，或放弃该效果——这条由产品边界（零运行时依赖）决定。
- Pro 站（`pro.reactbits.dev`）**不使用**：其许可比免费站更严，且禁止作训练数据。
- 文档中**不得**写"未使用其源码"这类会被自己打脸的断言；改写就要如实写"改编自"。


- reactbits 组件目录**不得随包分发**；改编按上节登记，且不单独售卖。
- 官方 `@deepseek-ai/dsh-client-ui-primitives` 可阅读、可派生视觉，但**不得 require**；
  品牌图形用包内 `assets/` + 构建期生成的内联 SVG。
- 品牌字标 `viewBox` 必须覆盖全部字形与徽标；当前为 `94 28 315 44`。
  第一个 `d` 从 `x≈95.85` 开始，不能被裁掉；改资产后重新生成并目检首尾字形。
