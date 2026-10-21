# dsh-lumina · 流光

> **Lumina 流光** —— [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 客户端的动效增强层。
>
> [English](README.md) | 中文

Lumina 为 DSH 的 Web / PWA / 桌面端客户端补齐五处视觉动效。它**不改变任何业务逻辑**、
**零运行时依赖**，并且**可以完全关掉**。

| # | 效果 | 落点 | 层级 |
| --- | --- | --- | --- |
| 1 | 品牌图标与字标 | `sidebar.brand.mark` / `sidebar.brand.name` | 1 · 官方 slot |
| 2 | 输入框边缘流光 | `[data-composer-card]` | 2 · CSS 钩子 |
| 3 | 打字机光标 | `[data-lexical-cursor]` | 2 · CSS 钩子 |
| 4 | 按钮按压与发送闪光 | `[data-composer-card] button` | 2 · CSS 钩子 |
| 5 | 新会话首屏入场 | `conversation.hero.brand.mark` | 1 · 官方 slot |

## 设计原则

1. **升级安全优先于效果丰富**——宁可少一个效果，也不写一个下个版本就会碎的补丁。
2. **降级必须静默**——钩子被改名则效果停止，界面不会坏。
3. **不争夺交互**——装饰层一律 `pointer-events: none`。
4. **默认尊重无障碍**——跟随系统「减少动态效果」，且不提供关闭该跟随的选项。
5. **零运行时依赖**——不引入 gsap / three.js / framer-motion。
6. **可整体关闭**——一个开关、一个 data 属性、一次卸载，三条路径都能回到官方样子。

## 安装

```sh
dsh plugin --profile <profile> add dsh-lumina
```

然后**重启客户端**——插件清单只在启动时读取，不支持热更新。

## 当前状态

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| P0 | 骨架、装载链、品牌 slot、设置面板 | 骨架已完成，面板待做 |
| P1 | 边框流光、打字机光标 | 待做 |
| P2 | 按钮按压、首屏入场 | 待做 |
| P3 | 强度档位、品牌预设、与 brand-studio 让位 | 待做 |

## 目录结构

```
src/               插件源码（host 半 + 浏览器半）
tests/             vitest 规格，含装载链证明
tools/             安装与探测脚本
docs/原始材料/       中文设计文档集（12 份）
docs/engineering/  工程规划、已验证的官方 API 面、文档修订记录
.agents/           Agent Note 与 dsh-lumina-dev Skill
```

## 文档导航

| 文档 | 内容 |
| --- | --- |
| [产品需求（PRD）](docs/product/产品需求.md) | **准入闸门**：定位、边界判据、V1 范围 |
| [架构设计](docs/engineering/架构设计.md) | 分层、依赖方向、适配层、失效半径 |
| [工程规划](docs/engineering/工程规划.md) | 工程形态、工具链、规范体系、分期与门禁 |
| [官方 API 面](docs/engineering/官方API面.md) | 已验证的 slot 契约、模块表、钩子清单 |
| [官方文档对照](docs/engineering/官方文档对照.md) | 与 25 份官方文档的逐条对照（14 条必须改 / 20 条建议改） |
| [设置页设计](docs/engineering/设置页设计.md) | 设置页落点、页面结构与向官方卡片通道的迁移路径 |
| [文档修订记录](docs/engineering/文档修订记录.md) | 与官方事实冲突的 15 处修订 |
| [规范工作流选型](docs/research/规范工作流选型结论.md) | 为什么用 Agent Note 而不用 OpenSpec |
| [原始材料](docs/原始材料/README.md) | 最初的 12 份设计文档：定位、约束、架构、效果规格、路线、风险 |

## 开发

```sh
npm install
npm run typecheck
npm run build
npm test
npm run install:local web
```

客户端升级后，在客户端控制台执行 `node tools/verify-hooks.mjs` 复测所有 `data-*` 钩子。

## 许可

MIT。reactbits 的视觉参考调研**不随包分发**，详见
`docs/原始材料/05-reactbits对照与许可.md`。
