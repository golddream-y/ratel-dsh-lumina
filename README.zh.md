![Ratel Lumina 流光 — 让交互，泛起流光。DeepSeek Harness 动效创意示意图。](assets/readme/hero-zh-CN.webp)

# Ratel Lumina · 流光

[English](README.md) · 中文 · [npm](https://www.npmjs.com/package/@ratel-works/dsh-lumina) · [更新记录](CHANGELOG.md)

**让交互，泛起流光。**

为 DeepSeek Harness 添一层恰到好处的动效。

Ratel Lumina 是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的视觉动效增强插件。

适用于 DSH 的桌面端与 Web / PWA 客户端。动效可以按偏好调整，也可以随时关闭。

## 为什么用 Lumina

- **连贯的体验**：以协调的视觉与动效丰富界面细节，让日常操作获得清晰、一致的反馈。
- **按偏好调整**：支持动效强度、配色和独立效果开关，保存后即时生效。
- **保留原有工作方式**：不修改模型、请求或消息内容，不延迟发送，不阻挡输入、点击与选中。
- **轻量且可关闭**：使用浏览器原生能力，不额外引入动效框架；支持总开关，跟随系统「减少动态效果」。

## 安装与更新

先安装 DeepSeek Harness，然后把插件加入实际使用的 profile：

```sh
dsh plugin --profile <profile> add @ratel-works/dsh-lumina
```

将 `<profile>` 替换为所用 profile，例如 `desktop` 或 `web`。升级时重新运行这条命令，然后**完整退出并重新打开客户端**，加载新的插件代码。

当前开发与验证基线为 DSH `0.2.1-rc.2`。客户端升级后，动效依赖的界面接口可能变化，需重新验证兼容性。

## 设置

打开 DSH 设置中的 **Lumina / 流光** 页面，调整效果、强度与配色。保存后即时生效，无需重启。

想恢复原有界面时，关闭 Lumina 总开关即可。系统启用「减少动态效果」时，插件会自动减少或停用动画。


## 文档与开发

- [更新记录](CHANGELOG.md)：版本变化与当前验证范围。
- [动效演示](docs/demo/README.md)：交互探索与设计原型，不代表全部已作为客户端效果发布。
- [产品与实现](docs/product/MVP.md)：功能范围、设计与工程文档入口。
- [发布与收录](docs/engineering/发布.md)：npm 发布流程和插件列表条目。

本地开发检查：

```sh
npm install
npm run typecheck
npm test
npm run build
npm run install:local -- web
```

## 许可

项目采用 MIT 许可。第三方代码的来源及附加许可条款见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
