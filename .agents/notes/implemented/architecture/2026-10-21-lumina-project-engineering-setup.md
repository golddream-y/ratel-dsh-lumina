# Agent Note: Lumina 工程化落地方案

Status: implemented — 12 份设计文档已就绪但零代码，本记录固定工程形态、工具链与规范体系，使其可被并行派工与机器校验

## Problem

`docs/原始材料/` 下已有 12 份中文设计文档（定位、平台约束、架构、五效果规格、路线、风险），
但工程本身不存在：没有 `package.json`、没有构建、没有测试、没有规范体系。
同时存在三个尚未澄清的事实性问题，会直接决定工程形态：

1. **官方提供了什么、哪些能直接用**——包括 slot 契约、主题 token、官方品牌图元、设置面板通道、
   客户端构建预设，以及一份 420 行的官方插件开发 Skill。
2. **规范工作流选什么**——OpenSpec 这类 spec-driven 工具是否适配 DSH。
3. **目录如何规划**——文档与代码、构建产物与源码的边界。

另有四项事实与现有设计文档冲突，必须在写第一行代码前澄清，否则代码会按错误的假设写出来。

## Decision

**工程形态**：仓库根即 npm 包 `dsh-lumina` 的根。`docs/` 放文档，`src/` 放源码，
`lib/` 为构建产物（不入库），`tools/` 放安装与探测脚本。`.agents/` 放规范体系。

**工具链**：tsdown 0.22.14 + TypeScript 5.9.3 + vitest 3.2.4（jsdom）+ React 18.3.1（peer）。
版本对齐已安装客户端 `0.2.1-rc.2` 与官方仓库，避免类型与产物形态漂移。

**客户端产物**：自实现 `tsdown.config.ts`（约 90 行）复现官方未发布的 `tsdown.client.ts` 契约——
lazy-CJS 工厂产物、`require` 只请求模块表 specifier、`return module.exports`。
官方明确不提供脚手架，这部分只能自己写。

**规范体系**：复刻 DSH 原生 Agent Note 树（`proposed/implemented/rejected` × 6 class），
并把本项目开发规范做成一个 DSH Skill（`.agents/skills/dsh-lumina-dev/SKILL.md`）。
**不引入 OpenSpec。** `docs/原始材料/` 的 12 份中文文档不重写，作为设计真相源保留。

**四项事实澄清**（详见 原文档修订记录（已归档））：

1. `priority` 在 **bundle 路径**按传入值生效（升序、最小者渲染），**动态插件路径**才被 facade 覆盖。
   官方 slot 目录里「不要传 priority」那条只对后者成立 → **`-20` 必须保留**。
2. 同 priority 的两个占用者**抛异常**，不是「后注册者胜」。
3. `styles.insert` 属动态插件座位；bundle 路径自建 `<style>` 标签（生产插件即如此）。
4. `settings.section` 的注册需 `id` / `order` / `locale` 命名空间 + 本地化 `label` thunk。

## Alternatives considered

**引入 OpenSpec（spec-driven 工作流）** —— 否决。四条硬理由：
其 34 个 adapter 中**没有 DSH**，命令文件落在 `.claude/commands/opsx/` 等 DSH 不读的目录；
`Requirement/Scenario` + `ADDED/MODIFIED/REMOVED` delta 体裁与中文设计散文正面冲突；
`openspec/specs/` 与 12 份中文文档构成双轨真相源；为 5 个动效引入全局 Node CLI 与四级目录边际收益为负。
DSH 自带的 Agent Note 体系是官方自己的答案（845 份在用），且 `docs/i18n/README.md` 明文许可
「a Chinese-first Agent Note is as legitimate as an English-first one」。

**不设构建步骤，手写 `lib/client.js`** —— 否决。四个效果并行开发，无类型系统会让集成错误
在运行时才暴露；且 §6.4 的验收要求本身就需要 DOM 断言能力。

**照抄官方 monorepo 模板（`packages/client/ui-attachment`）** —— 否决。该模板依赖 workspace
内部路径引用与 `clientBundle` 预发布预设，仓库外无法复现。改以生产第三方包
`dsh-brand-studio` 为模板（同一形态、同一产物契约、同一依赖声明方式）。

**把 12 份设计文档改写成 spec/需求体裁** —— 否决。改写会丢掉中文优先的作者体验，
且设计文档与规范记录是两个不同职责：前者说「要做什么」，后者说「为什么这么决定」。

## Consequences

- 装载链风险（设计文档认定的头号风险）**已解除**：`tests/client-bundle.spec.ts` 用可执行断言
  验证产物契约，4/4 通过；产物结构与生产包逐项同形。
- 插件已装入 `web` profile 的 `dsh.profile.bundles`（末尾，晚于 `dsh-brand-studio`），
  待客户端重启后生效（客户端只在启动时读清单，无热更新）。
- 五个效果可以并行派工：各自独立文件、各自 try/catch、共享 `core/` 契约。
- 官方 `data-*` 钩子与官方 artwork 存在**版本漂移风险**，已提供 `tools/verify-hooks.mjs`
  在升级后一键复测，而不是靠人肉发现静默降级。
- 遗留待拍板两项：Ratel 蜜獾图形不存在（R15）；流光字标需要自备 SVG，官方图元是单色做不到。
