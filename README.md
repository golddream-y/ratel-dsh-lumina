# dsh-lumina

> **Lumina 流光** — a motion enhancement layer for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) client.
>
> English | [中文](README.zh.md)

Lumina adds five visual motions to the DSH Web / PWA / desktop client. It changes **no business
logic**, carries **no runtime dependencies**, and can be switched off completely.

| # | Effect | Surface | Tier |
| --- | --- | --- | --- |
| 1 | Brand mark & wordmark | `sidebar.brand.mark` / `sidebar.brand.name` | 1 — official slot |
| 2 | Composer edge glow | `[data-composer-card]` | 2 — CSS on a data hook |
| 3 | Streaming caret | `[data-lexical-cursor]` | 2 — CSS on a data hook |
| 4 | Button press & send flash | `[data-composer-card] button` | 2 — CSS on a data hook |
| 5 | New-session hero entrance | `conversation.hero.brand.mark` | 1 — official slot |

## Design principles

1. **Upgrade safety over effect count.** A missing effect is better than a patch that breaks next
   release.
2. **Degrade silently.** If a hook is renamed upstream, the effect stops — nothing breaks.
3. **Never fight interaction.** Decoration layers are `pointer-events: none`, always.
4. **Accessibility by default.** The system "reduce motion" preference is honored and cannot be
   switched off.
5. **Zero runtime dependencies.** No gsap, no three.js, no framer-motion.
6. **One switch to remove everything.** A settings toggle, one data attribute, or uninstall.

## Install

```sh
dsh plugin --profile <profile> add dsh-lumina
```

Then restart the client — plugins are read from the manifest at startup and are not hot-reloaded.

## Status

| Phase | Scope | State |
| --- | --- | --- |
| P0 | Skeleton, loading chain, brand slot, settings panel | skeleton done, panel pending |
| P1 | Composer glow, streaming caret | pending |
| P2 | Button press, hero entrance | pending |
| P3 | Intensity tiers, brand presets, brand-studio deference | pending |

## Repository layout

```
src/               plugin source (host half + browser half)
tests/             vitest specs, including the loading-chain proof
tools/             install and probe scripts
docs/原始材料/       the Chinese design document set (12 files)
docs/engineering/  engineering plan, verified API surface, revision log
.agents/           agent notes and the dsh-lumina-dev skill
```

## Documentation

- [Engineering plan](docs/engineering/工程规划.md)
- [Verified official API surface](docs/engineering/官方API面.md)
- [Official documentation cross-check](docs/engineering/官方文档对照.md)
- [Settings page design](docs/engineering/设置页设计.md)
- [Design document revisions](docs/engineering/文档修订记录.md)
- [Original design set (Chinese)](docs/原始材料/README.md)

## Development

```sh
npm install
npm run typecheck
npm run build
npm test
npm run install:local web
```

After a client upgrade, run `node tools/verify-hooks.mjs` in the client console to check that every
`data-*` hook the effects rely on still exists.

## License

MIT. The reactbits visual-reference study is **not** redistributed with this package; see
`docs/原始材料/05-reactbits对照与许可.md` (Chinese).
