# DSH 兼容核查

Ratel Lumina 是宿主 DSH 的**增强层**，它的能力全部来自宿主：槽位、注入服务、DOM 钩子、CSS 变量。DSH 每次升级都可能改动其中任何一项，而插件不会因为钩子消失而报错——它只会**安静地不生效**。

这个目录把「我们依赖宿主的什么」变成一份可执行的清单，每次升级逐条核对。

## 目录结构

```text
docs/engineering/dsh-compat/
  README.md           本文件
  manifest.json       依赖清单（唯一事实源，脚本读取它）
  reports/            每次核查的报告，按版本命名
tools/check-dsh-compat.mjs   核查脚本
```

放在 `docs/engineering/` 是因为它首先是**人读的参考**（谁改插件都能查"我碰的这个钩子还成立吗"），报告按版本留档；脚本放在 `tools/`，与 `verify-hooks.mjs`、`verify-send-transfer.mjs` 一致。

## 什么时候跑

1. **每次 DSH 升级后**（rc 或正式版），升级完先跑一次，再重启客户端看观感；
2. 准备发版前；
3. 改动了 `src/client/adapter/targets.ts`、`inject` 列表、`occupySlot` 调用、或新增 CSS 变量依赖之后。

## 怎么跑

```bash
npm run check:dsh          # 核查 + 写报告 + 回写清单的 verified 段
npm run check:dsh:json     # 机器可读，不落盘
node tools/check-dsh-compat.mjs --dry-run          # 只看结果
node tools/check-dsh-compat.mjs --asar /path/to/app.asar
```

退出码：必需依赖缺失时返回 1，可直接当升级闸门用。

## 输出

- 终端：逐条 `✓ / ✗ / —`、命中次数、构建期依赖漂移；
- 报告：`reports/<版本>.md`，包含明细表、漂移对照、后续动作；
- 回写：`manifest.json` 的 `verified.version / checkedAt / missing`。

## 判定与修复

| 结果 | 含义 | 处理 |
| --- | --- | --- |
| ✓ 必需 | 名字仍在 asar 中 | 通过 |
| ✗ 必需 | 钩子/槽位/服务/变量改名或删除 | 在 `targets.ts`、`inject`、`occupySlot` 或样式里换成新值，再跑一次 |
| — 可选 | 可选项缺失 | 不阻断，但要在报告里确认降级表现是否可接受 |

修复步骤：

1. 在客户端里找到新版本的对应钩子（DevTools 或 `grep -ao` 搜 asar）；
2. 改代码里的常量，**同步改 `manifest.json` 的条目**（pattern 或 regex）；
3. 再跑一次核查，把报告一起提交。

## 维护清单的规则

- **新增依赖必须加条目**：新增一个 `data-*` 钩子、槽位、注入服务或 `--dsw-*` 变量时，同一条提交里补 `manifest.json`；
- **删除依赖时删条目**，不要留下永远为真的空检查；
- 每条必须写 `usedBy`（哪些效果依赖）和 `why`（为什么依赖，坏了会怎样）；
- `required: false` 只用于"缺了能降级"的项；不确定就写 `true`，宁可误报；
- 清单是**声明**，不是推断：不要用自动扫描生成条目，人工确认后再加。

## 已知局限

- 只验证**名字存在**，不验证**行为不变**（同一个钩子可能换了语义）——所以核查通过后仍要重启客户端做一次视觉/交互抽查；
- 文本匹配对压缩、动态拼接的名字可能误判（例如 `data-state":"ongoing"` 用 regex 覆盖几种写法）；
- 不覆盖宿主内部状态机（例如提交确认时序），那部分只能靠受控页面与真实客户端验证。
