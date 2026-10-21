# 官方 API 面 · 已验证清单

> 验证方式：**直接 grep 已安装的 `app.asar`**（二进制事实）+ 阅读官方仓库源码 + 比对生产插件 `dsh-brand-studio` 的构建产物。
> 仓库源码 checkout 处于脏状态（7389 项变更），因此**以 `app.asar` 为准**，源码只作定位线索。

---

## 1. 客户端模块装载协议

### 1.1 产物契约

客户端 `GET /plugins/<package>/client.js`，把文件当**脚本**执行。

```js
window.__ModuleLoader__.load({
  id: "<npm 包名>",
  factory: (require) => { /* ... */ return module.exports; },
})
```

| 事实 | 后果 | 验证 |
| --- | --- | --- |
| factory 必须 `return module.exports` | 返回 `module` 会让模块**永不物化**，`apply` 静默不执行，**零报错** | `tests/client-bundle.spec.ts` |
| `require` 同步、不可等待 | 请求模块表之外的 specifier = **当场 throw** | 同上 |
| 模块表基线固定 | 见 §2 | `packages/client/web/src/platform.ts` |

### 1.2 启动清单

```js
window.__DSH_BOOT__.entries.map(e => e.id)   // 应含 'dsh-lumina'
```

`entries` 每行：`{ id, url, rev, inject?, immediately?, external? }`。
`inject` 是**信息性**的包名依赖边（预检展示 / HMR diff），**不决定激活顺序**；
激活顺序由 cordis fiber 等待**服务**决定。

---

## 2. 模块表（可 `require` 的 specifier）

来自 `packages/client/web/src/platform.ts`：

```ts
PLATFORM_MODULES = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
]
PRELOADED_CLIENT_EXTERNALS = ['@deepseek-ai/dsh-client-runtime/client']
```

其它依赖必须**打进自己的产物**（客户端不提供）。

---

## 3. Slot 契约

实现：`packages/client/ui-slots/src/index.ts:787-868`

```js
ctx.slots.inject(key, callback)            // 声明感知；返回 disposer
ctx.slots.register(options, Component)     // 返回 disposer
```

### 3.1 四种基数

| kind | 必填 | 冲突规则 | 排序 |
| --- | --- | --- | --- |
| `single` | `name` | 同 priority 已占用 → **throw** | priority 升序，**最小者渲染** |
| `keyed` | `name` + `key` | 同 key + 同 priority → **throw** | 同上 |
| `list` | `name` + `id` | 同 id + 同 priority → **throw** | priority → `order` |
| `chain` | `name` + `select` | — | select 选举 |

- `priority` 默认 `0`；**升序、最小者渲染**。
- 错误信息原文：`register at a different priority to shadow it (lowest renders)`。
- 注册进**未声明**的 slot → throw。
- `options` 还接受 `order` / `label` / `locale` / `inject` / `children` / `store` / `registrant`。

### 3.2 我们要占的 slot（均已核对存在）

| Slot | kind | scope | 说明 |
| --- | --- | --- | --- |
| `sidebar.brand.mark` | single | root | 侧栏图标；官方品牌包**仅在 `DSH_CLIENT_BUILD_PROFILE==='official'` 时**才占，非 official 构建由 shell fallback 显示 |
| `sidebar.brand.name` | single | root | 字标 + 徽标 |
| `conversation.hero.brand.mark` | single | root | 新会话首屏图标 |
| `settings.section` | list | root | 设置页；需 `id` / `order` / `label`（本地化 thunk）/ `locale`（命名空间） |

### 3.3 冲突现状

| 竞争者 | 占的 slot | priority | 结果 |
| --- | --- | --- | --- |
| `dsh-brand-studio`（**当前已装**） | `sidebar.brand.mark`、`sidebar.brand.name` | `-10` | Lumina 用 `-20` → 胜出 |
| 官方 `@deepseek-ai/dsh-client-ui-brand-official` | 三个品牌 slot | `0`（默认） | 非 official 构建不注册；official 构建下 Lumina 仍胜出 |

---

## 4. 可用的服务

`ctx.<service>`，需在 `exports.inject` 中声明。`api-catalog.ts` 全量：

| 服务 | 关键方法 | 我们的用法 |
| --- | --- | --- |
| `slots` | `register` / `inject` | 占据品牌 slot |
| `locale` | `register(NS, {en, zh})` / `bind(NS)` | 面板文案 |
| `theme` | `overrideTokens(source, {token:{light,dark}})` / `getTheme()` / `register()` | 品牌色（source 被强制为包 id） |
| `timer` | `timeout` / `interval` / `debounce` / `throttle` | 发送闪光清理等 |
| `layout` | `toggleSidebar` / `openDetails` / `closeDetails` | 暂不用 |
| `sessions` / `workspaces` | — | 暂不用 |

> `ctx.get(name)` 是**可选查找**；未在 `inject` 声明的服务读取会抛错。

---

## 5. 生命周期

```js
ctx.effect(() => { ...; return disposer }, 'reason')   // 随 fiber 卸载自动清理
```

`ctx` 只属于 apply 世界；**组件不得接触 ctx**，数据只经四份 props share 传递
（`PropsRuntime` / `PropsRenderSlots` / `PropsStore` / inject face）。

---

## 6. 主题与样式

### 6.1 官方 token

用语义别名，**不要写死颜色**：

```
var(--dsw-alias-bg-layer-1)   var(--dsw-alias-label-primary)
var(--dsw-alias-label-primary-inverted)
```

深浅色由主题层自动切换 → **比 `prefers-color-scheme: dark` 可靠**
（对应风险 R14：Windows 桌面端可能不跟随系统）。

### 6.2 本插件的样式

Bundle 路径**没有** `styles.insert`（那是动态插件的座位），因此自建 `<style>` 标签：

```js
const tag = document.createElement('style')
tag.dataset.plugin = 'dsh-lumina'
tag.dataset.effect = effectId
document.head.append(tag)
```

`app.asar` 中已确认 `data-dyn` / `styles.insert` 存在（动态插件路径），但 bundle 路径按
`dsh-brand-studio` 的生产做法自建标签。

---

## 7. Tier 2 钩子（`app.asar` 实测命中数）

| 钩子 | 命中 | 用途 |
| --- | --- | --- |
| `data-composer-card` | 5 | 输入框卡片容器（边框流光） |
| `data-composer-input` | 1 | 可编辑正文 |
| `data-composer-overlay` | 2 | 浮层锚点 |
| `data-lexical-cursor` | 1 | 打字机光标 |
| `data-streaming` | 3 | 流式输出状态 |
| `data-ds-theme` | 4 | 主题 |
| `data-ds-dark-theme` | 23 | 深色主题 |

> 升级后用 `tools/verify-hooks.mjs` 复测；钩子消失是**静默降级**，不会报错。

---

## 8. 官方品牌图元（可直接用，MIT）

```js
const { FishLogo, BrandWordmark } = require('@deepseek-ai/dsh-client-ui-primitives')
```

| 图元 | 规格 | 备注 |
| --- | --- | --- |
| `FishLogo` | 原生 23.16×17.04，默认渲染 24×18 | 颜色走 `currentColor` |
| `BrandWordmark` | 原生 182×24（含鲸鱼）/ 156×24（不含） | figma 356:14644；`includeMark` 可去掉鲸鱼 |

⚠️ 两者都是**单色 `currentColor`**，做不了「深→浅→深 + 流光扫过」。
要流光字标必须自备 SVG 资产（见工程规划 §8 待决项 2、3）。

---

## 9. 打包与安装

| 事实 | 出处 |
| --- | --- |
| `dsh.bundle.patch` 缺失 → 只当普通依赖，**不进 profile layer** | `docs/user/develop/basic/publish.md` |
| 层级顺序：profile bundles（按列表序）→ profile patch → home patch → `--patch` | 同上 |
| `dsh plugin` 只是 **pnpm 转发器**，无 `create`/`init` 脚手架 | `apps/cli/src/plugin.ts` |
| `file:` 安装是**拷贝**不是软链 → 改源码必须重装 | 实测 |
| 安装路径必须**绝对路径** | 实测 |
| 客户端**启动时**读清单，**无热更新** | `docs/subsystems/client-modules.md` |

---

## 10. 不可依赖的东西

| 东西 | 原因 |
| --- | --- |
| `packages/client/ui-*` 的内部导出 | bundle purity 门禁禁止跨插件**值**导入；`ui-primitives` 是官方点名的窄静态 owner，属例外 |
| `packages/client/tsdown.client.ts` | 未发布，只能参考 |
| `docs/subsystems/skills.md` 描述的 Skill 机制 | 那是**模型侧**的 skill 目录，与插件运行时无关 |
| `deepseek-harness` checkout 作为 diff 基线 | 该 checkout 本身是脏的（7389 项变更） |
