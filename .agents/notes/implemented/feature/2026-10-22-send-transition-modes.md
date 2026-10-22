# 发送转场多模式：关闭 / 水滴 / 文字消解 / 小幽灵

日期：2026-10-22。用户确认三种形态：小幽灵用 React Bits 风格的圆润幽灵，"文字消解/文字合成"参考 React Bits 的 Blur Text，设置里四选一，默认文字消解。

## Decision

发送转场从布尔开关改为**枚举** `sendTransition: 'off' | 'liquid' | 'dissolve' | 'ghost'`，默认 `dissolve`；旧设置 `sendTransfer: true/false` 分别迁移为 `liquid` / `off`。保留 `off` 是为了满足 C6 的"可关掉即回到官方"约束。

架构上把转场拆成**共享运行时 + 模式渲染器**：

- `effects/transfer/runtime.ts` 负责一切必须一致的行为：覆盖层、字形副本、可逆接管、气泡遮罩、落点解析（echo 优先、durable rpcId 兜底）、冻结目的地、rAF 循环、清理与状态上报；
- `effects/transfer/liquid.ts` 是原有水滴实现，整体迁移，绘制逻辑未改；
- `effects/transfer/dissolve.ts` 是文字消解：源端逐字上浮淡出，目标端整层从 blur 解析成形（React Bits Blur Text 的做法，滤镜作用在整层而不是每个字，避免逐字滤镜的开销）；
- `effects/transfer/ghost.ts` 是小幽灵：一颗红色半透明精灵从输入框边缘升起，沿弧线摇摆飞向落点，抵达后化成目标文字。

三个模式都不新增运行时依赖，也不改写宿主内容；落点、接管与交接共用同一套代码。

## 为什么消解与幽灵更便宜

水滴模式每帧要跑一次局部 SVG 滤镜（alpha 融合），是掉帧的主要来源；消解模式只有逐字 transform/opacity 与一层 blur，幽灵模式只有一个合成层元素和关键帧。因此把消解设为默认，用户可随时切回水滴。

## Validation

类型检查、构建、40 项单元测试通过；新增配置迁移用例（旧布尔值 → 模式、非法值回落默认）与设置页用例（6 个开关 + 4 个模式按钮）。

实机验证仍待完成：三种模式在真实客户端的观感、落点交接、性能，以及 `off` 模式确实不产生任何发送装饰。

## 边界

`off` 模式下不安装转场桥接，因此发送只保留 press 的轻量确认；模式切换需要保存设置并重新应用效果。
