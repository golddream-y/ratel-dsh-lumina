![Ratel Lumina 流光 — 让交互，泛起流光。DeepSeek Harness 动效创意示意图。](assets/readme/hero-zh-CN.webp)

> **Ratel Lumina（Lumina 流光）** —— [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 客户端的动效增强层。
>
> [English](README.md) | 中文

Ratel Lumina 为 DSH 的 Web / PWA / 桌面端客户端补齐七处视觉动效。它**不改变任何业务逻辑**、
**零运行时依赖**，并且**可以完全关掉**。

| # | 效果 | 落点 | 层级 |
| --- | --- | --- | --- |
| 1 | 品牌图标与字标 | `sidebar.brand.mark` / `sidebar.brand.name` | 1 · 官方 slot |
| 2 | 输入框边缘流光 | `[data-composer-card]` | 2 · CSS 钩子 |
| 3 | 打字机光标 | `[data-lexical-cursor]` | 2 · CSS 钩子 |
| 4 | 按钮反馈与菜单淡入 | `[data-composer-card] button` / `[data-menu-material]` | 2 · CSS 钩子 |
| 5 | 新会话首屏入场 | `conversation.hero.brand.mark` | 1 · 官方 slot |
| 6 | 会话进行中指示 | `svg[data-state="ongoing"]` | 2 · CSS 钩子 |
| 7 | 发送转场（水滴 / 文字消解 / 小幽灵） | 公开提交身份 + 对应用户消息 | 2 · 临时字形装饰层 |

## 视觉语言

海报定下的方向：**光，而不是线**。

- 边缘用薄渐变 + 柔光，不用实心描边；
- 冷蓝为主，少量暖珊瑚作呼吸点；
- 动效像光带掠过，不抢内容、不改变布局；
- 大字号排版、白玻璃质感、克制留白。

## 设计原则

1. **升级安全优先于效果丰富**——宁可少一个效果，也不写一个下个版本就会碎的补丁。
2. **降级必须静默**——钩子被改名则效果停止，界面不会坏。
3. **不争夺交互**——装饰层一律 `pointer-events: none`。
4. **默认尊重无障碍**——跟随系统「减少动态效果」，且不提供关闭该跟随的选项。
5. **零运行时依赖**——不引入 gsap / three.js / framer-motion。
6. **可整体关闭**——一个开关、一个 data 属性、一次卸载，三条路径都能回到官方样子。

## 安装

```sh
dsh plugin --profile <profile> add @ratel-works/dsh-lumina
```

然后**重启客户端**——插件清单只在启动时读取，不支持热更新。

## 当前状态

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| P0 | 骨架、装载链、品牌 slot、设置页 | 已完成（19 项测试） |
| MVP | 七个效果 + 钩子自检 | 进行中，见 [MVP](docs/product/MVP.md) |
| 后续阶段 | ratel 资产、部署默认、官方设置卡片 | 规划 |

## 目录结构

```
src/               插件源码（host 半 + 浏览器半）
tests/             vitest 规格，含装载链证明
tools/             安装与探测脚本
docs/product/      产品需求与当前 MVP 交付范围
docs/engineering/  工程规划、官方 API 面、设置页设计、发布流程
.agents/           Agent Note 与 dsh-lumina-dev Skill
```

## 文档导航

| 文档 | 内容 |
| --- | --- |
| [产品需求（PRD）](docs/product/产品需求.md) | 长期边界与能力范围（准入闸门） |
| [MVP](docs/product/MVP.md) | **当前交付范围**、改编清单、实施顺序与验收 |
| [架构设计](docs/engineering/架构设计.md) | 分层、依赖方向、适配层、失效半径 |
| [技术详细设计](docs/engineering/技术详细设计.md) | L0–L4 实现契约、适配层、测试门禁、反返工决策 |
| [工程规划](docs/engineering/工程规划.md) | 工程形态、工具链、规范体系、分期与门禁 |
| [官方 API 面](docs/engineering/官方API面.md) | 已验证的 slot 契约、模块表、钩子清单 |
| [设置页设计](docs/engineering/设置页设计.md) | 设置页落点、页面结构与向官方卡片通道的迁移路径 |
| [发布流程](docs/engineering/发布.md) | npm 发版、scope/registry 前置条件与插件商店发现 |
| [动效素材库](docs/reference/动效素材库.md) | 只读参考：anime.js、GSAP、Textillate、React Bits 等；抄思路不引入 |

## 开发

```sh
npm install
npm run typecheck
npm run build
npm test
npm run install:local web
```

客户端升级后，在客户端控制台执行 `node tools/verify-hooks.mjs` 复测所有 `data-*` 钩子。

## 设计参考

动效建立在 Web 平台原语之上——CSS 过渡、关键帧、内联 SVG 遮罩。

若干效果**改编自** [reactbits.dev](https://reactbits.dev)（免费站，MIT + Commons Clause）发布的
组件。被改编的代码**保留原始版权与许可声明**，且每个改编文件都在
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 中登记来源与随之生效的许可条款。

| 流光的效果 | 改编自 |
| --- | --- |
| 品牌字标流光 | 文字流光 / 渐变文字 |
| 输入框边缘流光 | 边框光 |
| 打字机光标 | 打字机光标 |
| 按钮反馈与菜单淡入 | 点击确认 |
| 新会话首屏入场 | 由模糊到清晰入场 |

粒子/流体类光标效果经评估**未采用**：引入新的视觉实体、需要持续逐帧计算，超出本产品范围。

## 许可

MIT。reactbits 的调研笔记**不随包分发**，完整许可分析见
`THIRD_PARTY_NOTICES.md`。
