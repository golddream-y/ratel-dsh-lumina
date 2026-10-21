# Agent Note: ctx.effect 被当成 teardown 传入，插件在 apply 内自毁

Status: implemented — 品牌 slot 与设置页已实机出现

## Problem

在 desktop profile 里，插件 host 状态是“运行中”，client 的 `apply` 也执行了，但：

- `sidebar.brand.mark` 的 occupant 始终只有内置品牌；
- `settings.section` 里没有 `dsh-lumina`；
- 设置页、侧栏品牌、效果全部没有。

探针显示 `apply` 正常返回、slot 注册函数也执行了，但 `teardown` 探针与 `apply`
在**同一毫秒**触发；注册完的 slot 立刻被释放。此前的“profile bundle 行丢失”
和“primitives require”是另外两个真实问题，但都不是这个最终症状的根因。

## Root cause

```ts
ctx.effect(() => {
  unsubscribe()
  disposeEffects?.()
  // ...
}, 'dsh-lumina: teardown')
```

Cordis 的 `ctx.effect(callback)` 会**立即执行 callback**，并收集 callback 返回的
disposer。这里把“清理动作”直接当成了 callback，所以 apply 最后一步立刻执行
teardown：设置页、品牌 slot、样式、根属性全部被自己卸掉。

正确写法：

```ts
ctx.effect(() => () => {
  unsubscribe()
  disposeEffects?.()
  // ...
}, 'dsh-lumina: teardown')
```

同样的错误也出现在失败兜底页：`ctx.effect(dispose, ...)` 会立刻释放兜底页，改为
`ctx.effect(() => dispose, ...)`。

## Evidence

- `teardown` 探针时间戳与 `apply-done` 相同；
- 直接注册探针在同一毫秒写 `registered-direct`，随后 teardown；
- Cordis 栈：`v2.effect → applyInner → ...`，callback 由 `effect` 同步执行；
- 修复后 Inspector 显示：
  - `sidebar.brand.mark` priority `-20` active；
  - `settings.section` id `dsh-lumina` order `1200` active；
- 侧栏 wordmark 出现流光。

## Fix

- 主 teardown 改为返回 disposer 的 effect body；
- 失败兜底页同样返回 disposer；
- 临时探针全部移除；
- `tests/client-bundle.spec.ts` 的 fake `ctx.effect` 现在执行 callback 并断言返回
  函数，防止再把 teardown 直接传进去；
- 技术详细设计 §2.4 与 Skill 的运行时边界补充这条契约。

## Consequences

- 效果与设置页保持注册，直到插件真正卸载；
- `occupySlot` 仍保留“先直接 register、未声明再 inject”的写法，用于处理 apply
  早于 shell 声明 slot 的启动顺序，但不再依赖定时器；
- 这类错误没有异常、没有 UI 提示，只能靠 teardown/slot 探针或 Inspector occupant
  发现；回归测试固定了返回值形状。
