# Agent Note: dsh-lumina → Ratel Lumina / @ratel-works/dsh-lumina

Status: implemented — 2026-10-22

## Decision

项目名分三层：

- npm 包 / client module id：`@ratel-works/dsh-lumina`
- 产品全名：**Ratel Lumina**；UI 短名：**Lumina**
- host patch 行 / 显示入口：`include:ui-lumina`（id `ui-lumina`，保持不变）

社区同类插件的命名习惯是 `dsh-<feature>`；放进 Ratel 系列后用 npm scope
`@ratel-works/dsh-lumina`，同时保留 DSH 生态可发现性。

## Changes

| 位置 | 旧 | 新 |
| --- | --- | --- |
| `package.json.name` | `dsh-lumina` | `@ratel-works/dsh-lumina` |
| client factory id | `dsh-lumina` | `@ratel-works/dsh-lumina` |
| `cordis.patch.yml` 的 `name` | `dsh-lumina` | `@ratel-works/dsh-lumina` |
| 设置 section id | `dsh-lumina` | `ratel-lumina` |
| 失败兜底 section id | `dsh-lumina-error` | `ratel-lumina-error` |
| 样式标记 | `data-plugin="dsh-lumina"` | `data-plugin="ratel-lumina"` |
| 设置存储 key | `dsh-lumina/settings/v1` | `ratel-lumina/settings/v1` |
| 日志前缀 | `[dsh-lumina]` | `[ratel-lumina]` |

旧存储 key 仍作为 `LEGACY_STORAGE_KEY` 读取，已有本地设置不会丢。host patch 行
`ui-lumina` 不变，所以插件在设置/插件列表中的短名仍是 Lumina。

## Profile migration

`tools/install-local.sh` 现在会：

1. 移除新的 `@ratel-works/dsh-lumina` 和旧 `dsh-lumina`；
2. 删除两种 `node_modules` 目录；
3. 安装 scoped 包；
4. 确保 `dsh.profile.bundles` 只有 `@ratel-works/dsh-lumina`，并清掉旧 dependency/bundle 行。

desktop profile 已验证：

```text
deps:    ['@ratel-works/dsh-lumina']
bundles: ['@ratel-works/dsh-lumina']
```

## Not renamed

- 仓库目录仍是 `rate-dsh-lumina`，发布前可改为 `ratel-dsh-lumina`，不影响包 id；
- `.agents/skills/dsh-lumina-dev/` 作为开发 Skill 的内部目录名保留，内容已更新为
  Ratel Lumina / `@ratel-works/dsh-lumina`；
- `LUMINA_LOCALE_NAMESPACE` 仍是 `settings.lumina`；短名 Lumina 不变。

## Verification

- `npm run typecheck` / `npm test`：19 tests passed；
- 构建产物：`lib/client.js` 的 factory id 为 `@ratel-works/dsh-lumina`；
- 安装后 profile 依赖/bundle 行为 scoped 包，旧包目录已删除；
- 首次重启后需确认品牌、设置页和其余效果仍正常。
