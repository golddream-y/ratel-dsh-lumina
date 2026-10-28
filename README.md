![Ratel Lumina — Make development more fun. A concept illustration of subtle motion for DeepSeek Harness.](assets/readme/hero-en.webp)

# Ratel Lumina

English · [中文](README.zh.md)

[![npm version](https://img.shields.io/npm/v/@ratel-works/dsh-lumina?style=flat-square&label=npm)](https://www.npmjs.com/package/@ratel-works/dsh-lumina) [![License: MIT](https://img.shields.io/badge/License-MIT-0969da?style=flat-square)](LICENSE)

**Make development more fun.**

Ratel Lumina is a visual and motion enhancement plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), available on desktop and Web / PWA clients. From navigation and running sessions to typing and sending, it adds a subtle layer of motion to everyday development.

## Why Lumina

- **Connected interactions.** Panels, menus, dialogs and message transitions flow together, while light and color bring running sessions to life.
- **Your own style.** Choose the brand finish, colors, motion intensity and send effect. Each effect can be switched off individually.
- **Native browser capabilities.** No additional animation framework, with support for system reduced-motion preferences.

Lumina does not change models, requests or message content, delay submission, or block typing, clicking and selection.

## Install and update

Install DeepSeek Harness first, then search for **`ratel-dsh-lumina`** (author golddream-y) in the plugin store.

You can also install from the command line:

```sh
dsh plugin --profile <profile> add @ratel-works/dsh-lumina
```

Replace `<profile>` with the profile you use: typically `desktop` for the desktop client or `web` for Web / PWA.

**After updating the plugin, fully quit and reopen the client** to load the new code. To update from the command line, run the installation command again.

## Settings

Open **Lumina / 流光** in DSH settings. Saved changes apply immediately, without restarting.

- **Effects and style.** Choose colors, motion intensity and a send effect, or turn individual effects off.
- **Performance and quality.** Choose **Performance**, **Balanced**, **Quality** or **Ultra**; Balanced is the default. Profiles adjust drawing frequency, resolution and detail independently of motion intensity. Hover or focus a profile button to see its parameters. Frame rates are limits, not guarantees, and depend on your device and display.
- **Turning motion off.** The master switch restores the original interface. When system reduced motion is enabled, Lumina reduces or disables animations automatically.

## Support

This is a plugin I built for myself, released in the open. The whole point is to make tedious development a little more fun. If you find it useful too, you can buy me a coffee:

- [Afdian](https://afdian.com/a/golddream) — WeChat Pay or Alipay
- [Ko-fi](https://ko-fi.com/golddream_y) — PayPal, card

## Documentation and development

- [Changelog](CHANGELOG.md): features, improvements and fixes in each release.
- [Motion demos](docs/demo/README.md): interaction studies and design prototypes; these are not all shipped client effects.
- [Implementation status](docs/product/功能实现状态.md): shipped features, verification scope and future work.
- [Publishing and listing](docs/engineering/发布.md): npm releases and plugin-list submissions.

<details>
<summary>Local development</summary>

```sh
npm install
npm run typecheck
npm test
npm run build
npm run install:local -- web
```

</details>

## License

The project uses the MIT license. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for third-party sources and additional license terms.

DeepSeek marks belong to their respective rights holders. This project does not claim ownership of those marks or grant brand usage rights under its MIT license. See [third-party notices](THIRD_PARTY_NOTICES.md).
