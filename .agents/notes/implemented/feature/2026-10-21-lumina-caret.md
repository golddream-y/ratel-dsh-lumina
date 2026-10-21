# Agent Note: M3/M9 光标实现

Status: implemented — 流式末尾光标 + 输入框 overlay 已落代码并通过 jsdom 规格；等待客户端重启验收

## Problem

`[data-lexical-cursor]` 是 Lexical 的 block cursor，不是 native caret；native caret 只能改
`caret-color`，无法做透明度呼吸。原 04c 规格把光标放在输入框，且假设
`[data-streaming] [data-lexical-cursor]` 能匹配，实际两者不在同一子树。

产品决定两个场景都要效果：

1. 流式输出时末尾出现打字机光标；
2. 输入框里的光标也呼吸。

## Decision

**同一 `caret` 开关，两段实现：**

- 流式末尾：`[data-streaming] > div > 最后一个文本块::after`，2px 品牌竖线，
  `lumina-caret-breathe` 使用 `--lumina-caret-stream`；
- 输入框：`span.lumina-caret-overlay` 绝对定位在 composer card 内，跟随折叠选区；
  overlay 可见时给 input 加 `data-lumina-caret="overlay"`，CSS 把 native caret 设为透明；
  失焦、选区非折叠、IME 组合、无矩形或卡片非定位时立即移除属性，native caret 回来。

支撑设施：

- `adapter/targets.ts` 收口选择器（含 `streamingTail` 两条候选）；
- `adapter/selector.ts` 处理 `:is(p, h1, …)` 的顶层逗号，伪元素不会被塞进 `:is` 内部；
- `adapter/streaming.ts` 唯一 observer，写根属性 `data-lumina-streaming`；
- `style/tokens.ts` 逐效果时长 token，CSS 与 JS 共用；
- `brandCss` 变量从 `:root` 改挂 `html[data-lumina]`，面板在总开关关闭时仍可读色。

## Alternatives considered

**只做流式末尾** —— 否决。输入时看不到变化，效果不完整。

**只做 block cursor** —— 否决。block cursor 只在块级光标场景出现，覆盖不了正常输入。

**overlay 常驻、不隐藏 native caret** —— 否决。会与 native caret 重叠，且 IME 下不可控；
必须按状态回退。

**为 overlay 用 MutationObserver 跟踪编辑器重建** —— 否决。与“全项目一个 observer”冲突；
先用 focus/selection 事件 + 每次查询重取元素，实测不足再加。

## Consequences

- 输入框 overlay 是唯一写 `caret-color: transparent` 的地方；任何定位失败都回退 native，
  不会留下“没有光标”的状态。
- `caret.spec.ts` 覆盖 CSS、安装/卸载、overlay 显示/隐藏、IME 组合四条路径；
  现有 15/15 通过，typecheck 通过，build 通过。
- 尚未在真实客户端重启验证；流式末尾的选择器与 overlay 定位需实机采样确认。
