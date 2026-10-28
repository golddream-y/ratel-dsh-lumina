![Ratel Lumina 流光 — 让开发，有趣一点。DeepSeek Harness 动效创意示意图。](assets/readme/hero-zh-CN.webp)

# Ratel Lumina · 流光

[English](README.md) · 中文

[![npm version](https://img.shields.io/npm/v/@ratel-works/dsh-lumina?style=flat-square&label=npm)](https://www.npmjs.com/package/@ratel-works/dsh-lumina) [![License: MIT](https://img.shields.io/badge/License-MIT-0969da?style=flat-square)](LICENSE)

**让开发，有趣一点。**

Ratel Lumina 是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的视觉动效增强插件，适用于桌面端与 Web / PWA 客户端。从界面切换、会话运行到输入发送，为日常开发添一层恰到好处的动效。

## 为什么用 Lumina

- **连贯的交互**：面板开合、菜单弹框和消息转场自然衔接，运行中的会话有流动的光与色彩。
- **自己的风格**：品牌质感、配色、动效强度和发送效果可以按偏好选择，每个效果都能单独关闭。
- **原生的实现**：使用浏览器原生能力，不额外引入动效框架，并跟随系统「减少动态效果」。

Lumina 不修改模型、请求或消息内容，不延迟发送，也不阻挡输入、点击与选中。

## 安装与更新

先安装 DeepSeek Harness，然后在插件商店搜索 **`ratel-dsh-lumina`**（作者 golddream-y）安装。

也可以用命令行安装到指定 profile：

```sh
dsh plugin --profile <profile> add @ratel-works/dsh-lumina
```

将 `<profile>` 替换为实际使用的配置名称：桌面端通常为 `desktop`，Web / PWA 通常为 `web`。

**更新插件后，完整退出并重新打开客户端**，才能加载新的插件代码。通过命令行更新时，重新执行安装命令即可。

## 设置

打开 DSH 设置中的 **Lumina / 流光** 页面。设置保存后即时生效，无需重启。

- **效果与风格**：选择配色、动效强度和发送效果，或单独关闭某个效果。
- **性能与画质**：提供「性能优先」「均衡」「画质优先」「极致画质」四档，默认均衡。档位综合调整绘制频率、清晰度和细节，与动效强度独立；悬停或键盘聚焦档位按钮可查看参数。帧率为上限，实际表现取决于设备与屏幕刷新率。
- **关闭与恢复**：关闭总开关即可恢复原有界面；系统启用「减少动态效果」时，Lumina 自动减少或停用动画。

## 赞助

这是我给自己做的插件，顺手开源。初衷就是让枯燥的开发有趣一点。如果你也觉得好用，可以请我喝杯咖啡：

- [爱发电](https://afdian.com/a/golddream) —— 微信支付、支付宝
- [Ko-fi](https://ko-fi.com/golddream_y) —— PayPal、银行卡

## 文档与开发

- [更新记录](CHANGELOG.md)：各版本的功能、优化与修复。
- [动效演示](docs/demo/README.md)：交互探索与设计原型，不代表全部已作为客户端效果发布。
- [功能实现状态](docs/product/功能实现状态.md)：已发布功能、验证范围与后续计划。
- [发布与收录](docs/engineering/发布.md)：npm 发布流程和插件列表条目。

<details>
<summary>本地开发</summary>

```sh
npm install
npm run typecheck
npm test
npm run build
npm run install:local -- web
```

</details>

## 许可

项目采用 MIT 许可。第三方代码的来源及附加许可条款见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

DeepSeek 标识归其各自权利人所有。本项目不主张这些标识的所有权，MIT 许可不代表授予品牌使用权。详见[第三方声明](THIRD_PARTY_NOTICES.md)。
