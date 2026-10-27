![Ratel Lumina 流光 — 让交互，泛起流光。DeepSeek Harness 动效创意示意图。](assets/readme/hero-zh-CN.webp)

# Ratel Lumina · 流光

[English](README.md) · 中文

[![npm version](https://img.shields.io/npm/v/@ratel-works/dsh-lumina?style=flat-square&label=npm)](https://www.npmjs.com/package/@ratel-works/dsh-lumina) [![License: MIT](https://img.shields.io/badge/License-MIT-0969da?style=flat-square)](LICENSE)

**让交互，泛起流光。**

为 DeepSeek Harness 添一层恰到好处的动效。

Ratel Lumina 是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的视觉动效增强插件。

适用于 DSH 的桌面端与 Web / PWA 客户端。动效可以按偏好调整，也可以随时关闭。

## 为什么用 Lumina

- **连贯的体验**：从界面切换、菜单弹框到输入发送，以协调的视觉与动效丰富日常操作。
- **按偏好调整**：支持动效强度、配色、性能档位和独立效果开关，保存后即时生效。
- **保留原有工作方式**：不修改模型、请求或消息内容，不延迟发送，不阻挡输入、点击与选中。
- **轻量且可关闭**：使用浏览器原生能力，不额外引入动效框架；支持总开关，跟随系统「减少动态效果」。

## 安装与更新

先安装 DeepSeek Harness，然后在插件商店搜索 **`ratel-dsh-lumina`**（作者 golddream-y）安装。

也可以用命令行安装到指定 profile：

```sh
dsh plugin --profile <profile> add @ratel-works/dsh-lumina
```

将 `<profile>` 替换为 `desktop` 或 `web`。升级时重新安装，然后**完整退出并重新打开客户端**，加载新的插件代码。


## 设置

打开 DSH 设置中的 **Lumina / 流光** 页面，调整效果、强度、配色与性能档位。保存后即时生效，无需重启。

性能提供「性能优先」「均衡」「画质优先」「极致画质」四档，默认均衡；与动效强度独立，综合调整绘制频率、清晰度和细节。悬停或键盘聚焦档位按钮可查看具体参数。档位中的帧率为上限，实际表现取决于设备与屏幕刷新率。

想恢复原有界面时，关闭 Lumina 总开关即可。系统启用「减少动态效果」时，插件会自动减少或停用动画。


## 文档与开发

- [更新记录](CHANGELOG.md)：各版本的功能、优化与修复。
- [动效演示](docs/demo/README.md)：交互探索与设计原型，不代表全部已作为客户端效果发布。
- [功能实现状态](docs/product/功能实现状态.md)：已发布功能、验证范围与后续计划。
- [发布与收录](docs/engineering/发布.md)：npm 发布流程和插件列表条目。

本地开发检查：

```sh
npm install
npm run typecheck
npm test
npm run build
npm run install:local -- web
```

## 赞助

这是我给自己做的插件，顺手开源。初衷就是让枯燥的开发有趣一点。如果你也觉得好用，可以请我喝杯咖啡：

- [爱发电](https://afdian.com/a/golddream) —— 微信支付、支付宝
- [Ko-fi](https://ko-fi.com/golddream_y) —— PayPal、银行卡


## 许可

项目采用 MIT 许可。第三方代码的来源及附加许可条款见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

### 品牌素材

DeepSeek 标识归其各自权利人所有。本项目不主张这些标识的所有权，MIT 许可不代表授予品牌使用权。详见[第三方声明](THIRD_PARTY_NOTICES.md)。

---

版本更新记录见 [CHANGELOG.md](CHANGELOG.md)。
