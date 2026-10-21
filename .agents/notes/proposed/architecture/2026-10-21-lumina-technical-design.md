# Agent Note: Lumina 技术详细设计（六效果 / CSS-first 适配层）

Status: proposed — 技术设计 v1.1 已落盘，等待评审；代码尚未按此实现

## Problem

MVP 已扩到六个效果（含新增的会话进行中指示），但实现层只有 P0 骨架：

- L1 适配层不存在，效果若要写选择器就会散落全库；
- 光标、输入框伪元素、streaming 状态在真实 DOM 里的形态未确认，先写代码必然返工；
- 品牌资产在 bundle 路径无法运行时读文件；
- 设置模型要加第六个效果字段，旧 payload 不能丢；
- 每个效果各自建 observer / 样式标签会带来生命周期 bug。

## Decision

详细设计见 [技术详细设计](../../../../docs/engineering/技术详细设计.md)。核心决定：

1. **L1 采用 CSS-first**：CSS 效果只需要选择器，不需要活句柄；只有 M4 闪光和诊断需要
   `query`。v1 不做通用句柄/重绑框架，减少一类生命周期 bug。
2. **全项目只有一个 observer**：只观察 `data-streaming`，防抖 120ms，写根属性
   `data-lumina-streaming`；效果层不得 new MutationObserver。
3. **M3 两段都做**：流式末尾用 `[data-streaming]` 最后一个文本块的伪元素；
   输入框用 M9 自定义 overlay 跟随折叠选区，native caret 仅在 overlay 可见时透明。
   两段共用一个 `caret` 开关，不新增第七个开关。
4. **伪元素统一申领**：官方 `cardWorkspaceTrigger` 已占用 `::after`；
   M2 用 `::before`、M4 用 `::after`，冲突时降级并诊断。
5. **品牌资产构建期生成 TSX**：`tools/gen-brand-assets.mjs` → `brand/generated.tsx`，
   运行时不读文件、不 fetch。
6. **M8 作为第六个效果**：`sessionActivity` 独立开关；只改原生 14×14 SVG，
   替换官方 spinner，不新增动画实例。
7. **v1 不做结构推断**：只收规范 + 已证实的历史选择器；等第一次真实升级失配再加。
8. **动画分三类**：严格常驻 2（品牌 + 边框）、条件持续（流式光标 + 会话进行中）、
   触发（按压 + 首屏）；PRD 的「常驻 ≤2」成立，Skill 不写数字。

## Alternatives considered

**完整实现架构文档的句柄 + 策略链 + 重绑框架** —— 否决。CSS 效果不需要活句柄，
通用重绑会引入 observer 生命周期、重复绑定、缓存失效等一整套问题，收益为零。

**只做流式末尾、不做输入框** —— 否决。输入时看不到光标变化，效果不完整；
输入框 overlay 虽然要跟踪选区，但可以在失焦/选区/IME 时立即回退 native caret，
边界清楚，值得做。

**运行时读取 `assets/*.svg`** —— 否决。浏览器半没有 fs，fetch 会引入网络/CSP/离线问题；
构建期生成是唯一稳定路径。

**每个效果各自建 observer 或各自注入 `<style>`** —— 否决。observer 数量与样式标签
生命周期会失控；统一到一个 streaming observer 与一个 style sink。

**保留 `[class*="sidebar"]` 按压** —— 否决。hash 类名违反硬约束；MVP 只做输入区按钮。

## Consequences

- 六个效果可按文件域并行：M2 / M3 / M8 互不重叠；M1 / M5 共享品牌资产；
  M4 依赖 L1 streaming；面板最后收口。
- M3 覆盖流式输出与输入框两处；输入框 overlay 在失焦、选区、IME 时回退 native caret。
- 动画分类与预算只写在技术详细设计；Skill 只保留“以设计为准”的指针，不复制数字。
- L1 的结构推断留了类型位但不实现；第一次真实升级失配时按设计补一条策略 + fixture。
- `sessionActivity` 是加法字段，存储 key 仍为 v1；旧配置自动补默认 true。
