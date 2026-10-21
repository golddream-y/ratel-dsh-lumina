---
name: dsh-lumina-dev
description: 开发和修改 dsh-lumina（DSH 客户端动效增强层）时必须遵守的工程约束。涵盖 slot 注册契约、priority 语义、模块表 require 边界、CSS 变量与主题 token、减少动态、性能预算、验收证据要求与文档同步规则。在修改 src/ 下的任何文件、注册或调整 slot、编写动效 CSS、扩展效果、或新增/修改测试前加载。
---

# dsh-lumina 开发约束

本项目是 **DeepSeek Harness 客户端的动效增强层**：一个 npm 包 `dsh-lumina`，
以 profile bundle 的形式占据官方 UI slot 并注入 CSS 动效。

**先读**：`docs/原始材料/02-平台约束（执行前必读）.md`（平台硬约束）、
`docs/engineering/工程规划.md`（工程形态与工具链）、
`docs/engineering/官方API面.md`（已验证的 API 清单）。

---

## 1. 三条不可违反的硬约束

1. **不改 `app.asar`**——它被代码签名逐字节封印，改一字节即破签、macOS 拒绝启动。
   所有实现必须在插件层完成。
2. **不用 hash 类名做选择器**——客户端类名形如 `_3WPZCG_brandName`，每次构建都变。
   只用 `data-*` 钩子与官方 slot。（`04d` 里残留的 `[class*="sidebar"]` 是待删的违规项，
   不要模仿，也不要新增同类选择器。）
3. **不碰业务逻辑**——动效不承载信息；关掉后功能与含义完全不变。
   不监听模型输出内容、不改请求、不写业务状态。

## 2. Slot 注册契约

```js
ctx.slots.inject(slotKey, () => {
  let release
  try {
    release = ctx.slots.register({ name: slotKey, priority: -20 }, Component)
  } catch (error) {
    console.warn('[dsh-lumina] cannot occupy slot', error)
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
迁移步骤见 [设置页设计](../../docs/engineering/设置页设计.md) §1。

设置项持久化自持于 `localStorage["dsh-lumina/settings/v1"]`；模型是**扁平 8 字段**，
迁移到官方通道时不需要改数据结构。

## 3. 运行时边界

- 浏览器半**不能 `import`**，只有工厂收到的 `require`。可请求的 specifier 仅限模块表：
  `react` / `react/jsx-runtime` / `react-dom` / `react-dom/client` / `@deepseek-ai/cordis` /
  `@deepseek-ai/dsh-client-ui-slots` / `@deepseek-ai/dsh-client-ui-primitives` /
  `@deepseek-ai/dsh-client-runtime/client`。
  **请求表外的 specifier = 当场 throw**（require 是同步的）。
- 工厂必须 `return module.exports`。返回 `module` 会让插件**永不物化、零报错**。
- bundle 路径**没有 `styles.insert`**——那是动态插件的座位。自建 `<style>` 标签，
  带 `data-plugin="dsh-lumina"` 与 `data-effect="<effectId>"`。
- 组件不得接触 `ctx`；数据只经 props 传递。`ctx` 只属于 apply 世界。

## 4. 样式与主题

- **不写死颜色**。用官方语义 token（`var(--dsw-alias-label-primary)` 等）或本插件的
  `--lumina-*` 变量。深浅色用 `--dsw-*` 或 `[data-ds-dark-theme]` 兜底，
  **不要只靠 `prefers-color-scheme`**（Windows 桌面端可能不跟随系统）。
- 本插件的品牌色由 `brand` 配置项驱动，**所有效果只消费变量**，不硬编码红/蓝。
  切预设后品牌区与全部效果必须同步变色。
- 装饰层一律 `position: absolute` + `pointer-events: none`，永不阻挡点击/输入/拖拽/选中。
- 只动 `transform` / `opacity`，不碰 `width` / `height` / `top` / `left`。
- 常驻动画**上限 2 条**（边框 + 光标），其余一次性或交互触发。

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
| 装载 | `window.__DSH_BOOT__.entries` 含 `dsh-lumina`；控制台无 `cannot occupy` / `effect failed` |
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

- 设计变更 → 先改 `docs/原始材料/` 对应文档，再改代码。
- 决策与理由 → 写 `.agents/notes/{proposed,implemented,rejected}/<class>/yyyy-mm-dd-<topic>.md`。
  `implemented` 必含 `## Alternatives considered`。
- 与官方事实冲突的假设 → 记入 `docs/engineering/文档修订记录.md`。

## 10. 许可

- reactbits 仅作**视觉参考**。不得复制/直译其源码，不得再分发组件或其「移植版」；
  `docs/原始材料/08-reactbits组件目录（调研）.md` **不得随包分发**。
- 官方 `@deepseek-ai/dsh-client-ui-primitives` 为 MIT，可直接使用与派生（须注明出处）。
