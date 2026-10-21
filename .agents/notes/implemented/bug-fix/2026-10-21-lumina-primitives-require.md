# Agent Note: 第三方 bundle 不得 require primitives

Status: implemented — 客户端 bundle 已去掉 `@deepseek-ai/dsh-client-ui-primitives`，品牌图形改为内联 SVG

> 后续更正：这条禁用的 require 是真实违规，但不是最终“设置页/品牌都不出现”的根因。
> 最终根因是 `ctx.effect` 把 teardown 当 callback 传入，apply 内立即自毁；见
> [2026-10-22-lumina-effect-teardown](./2026-10-22-lumina-effect-teardown.md)。

## Problem

把插件装进 desktop profile 后：

- 插件列表能看到 `dsh-lumina`；
- host 的 `include:ui-lumina` 是 `enabled: true, fiberPhase: active`；
- `clientModules.graph()` 的 application batch 里也有 `dsh-lumina`；
- 但 client 的 `settings.section` 和 `sidebar.brand.mark` 都没有 Lumina 的 occupant，
  说明 `apply` 从未执行。

bundle 顶部有一条：

```js
require('@deepseek-ai/dsh-client-ui-primitives')
```

当前客户端的第三方插件规范明确要求：**不要 require 任何 Harness Client 包**
（包括 primitives）。`dsh.client.inject` 只负责激活排序，不是可 require 的依赖。
模块表里存在该 specifier 不代表第三方 bundle 可以使用；require 失败会让模块
**不物化且无 UI 报错**，正好对应“列表里有、但没有 apply”的现象。

## Decision

- 品牌图形改为包内 `assets/deepseek-harness-logo-v2.svg` →
  `tools/gen-brand-assets.mjs` → `src/client/brand/generated.tsx` → 内联 SVG；
- 运行时只 require `react` 与 `react/jsx-runtime`；
- `tests/client-bundle.spec.ts` 的 `EXPECTED_REQUIRES` 收紧为这两项，防止回归；
- `tsdown.config.ts` 的 external 表移除 primitives；devDependency 移除；
- 文档、Skill 同步修正“primitives 可直接用”的旧说法。

## Alternatives considered

**继续 require primitives，赌它只是模块表可见** —— 否决。现象已经证明模块没有物化；
第三方规范也明确禁止，继续依赖只会重复静默失败。

**运行时 `fetch` 官方 SVG** —— 否决。bundle 无 fs，fetch 引入网络/CSP/离线问题；
内联生成是唯一稳定路径。

**用 `<img>` 引用 asset** —— 否决。无法做字标内的 mask 流光，也无法跟随主题 token。

## Consequences

- bundle 从 55KB 增到 77KB（路径数据内联），但仍远小于引入动画库；
- M1 现在真正拥有包内品牌资产，后续 ratel 预设只需替换 `assets/` 并重新生成；
- 需要在去掉 primitives 后**重启客户端**验证 `apply`；host 侧安装与 graph 已确认无误。
