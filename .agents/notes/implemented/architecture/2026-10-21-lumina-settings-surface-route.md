# Agent Note: Lumina 设置页落点裁决

Status: implemented — 官方第三方设置卡片通道在已安装客户端上不可用，裁决改走 `settings.section` 独立页并记录迁移路径

## Problem

Lumina 需要一个设置页，让用户开关动效、切换品牌预设与强度。
官方 `docs/cookbook/adding-a-settings-card.md` 给出的第三方路径是**双半**方案：
Host 半用 `installSettingsSection` 注册 settings 命名空间，Client 半把卡片注册进
keyed 的 `settings.plugin.item`，两者以命名空间为 join key 自动配对。

但已安装的客户端是 **0.2.1-rc.2**。这套通道在该版本里**不存在**。

从 `app.asar` 解出实际安装的包并逐个 grep：

| 符号 | 所在包（均为 0.2.1-rc.2） | 命中 |
| --- | --- | --- |
| `installSettingsSection` / `settingsNamespace` | `@deepseek-ai/dsh-settings` | **0** |
| `settingsScope` | `@deepseek-ai/dsh-client-ui-settings` | **0** |
| `settings.plugin.item` | `@deepseek-ai/dsh-client-ui-settings-plugins` | **0** |
| `BashCard` | 同上 | **0** |
| `settings.plugins.tab` | 同上 | 7 |
| `settings.section` | 同上 | 5 |

npm 上发布的 `@deepseek-ai/dsh-client-ui-settings-plugins@0.2.1-rc.2` 同样是 0 命中，
说明这不是安装副本陈旧，而是该版本本身没有这套符号。
这些符号只存在于源码 checkout 的更晚版本（`settings.plugin.item` 由
`a2d0f7f411 refactor: apply repository naming contract` 一系提交引入），
尚未进入已发布 npm 包，因此也不在用户实际运行的客户端里。

## Decision

**走 `settings.section` 独立页**（Client 半单侧，配置自持于 `localStorage`），
并把设置模型刻意做成**扁平 8 字段**，使将来的迁移只改注册方式、不动数据。

理由：

1. 官方路径在当前客户端上会让 `ctx.slots.inject('settings.plugin.item', …)`
   等待一个**永不出现的声明**——卡片静默不渲染，正是风险 R9 那一类失败。
2. `settings.section` 是当前客户端唯一可用、且有生产验证的第三方通道
   （已安装的 `dsh-brand-studio` 正是这样做的，其产物中可见
   `{ name: "settings.section", id: "dsh-brand-studio", order: 1e3,
   label: () => ctx.locale.bind(NS)("nav"), locale: NS }`）。
3. 官方文档描述的是**更新的客户端**。把新客户端的规范套到旧客户端上，
   得到的不是"更规范"，而是"不工作"。

**迁移条件**：客户端版本提供 `settings.plugin.item` 与 `settingsScope` 之后，
按 [设置页设计](../../../../docs/engineering/设置页设计.md) §1 的四步切换：
Host 半加 `installSettingsSection` + Schemastery schema（命名空间 `lumina`，
须为 lowercase kebab-case），Client 半把注册目标换成 `settings.plugin.item`
（`key: 'lumina'`，keyed 槽不声明 `order`），写入从 `store.commit()` 换成
`scope.set(field, value)`。

**同时记录的其它裁决**：

- 设置页按**草稿式表单**实现：编辑进草稿，保存才落盘，取消可无损回退，
  外部改动显示为冲突提示而非静默覆盖。
- 面板样式只用 `--dsw-alias-*` 语义 token；品牌色以变量发布，预览区展示
  **草稿**品牌（两个预设各自发布为 `--lumina-brand-<preset>`）。
- 面板样式独立于效果开关安装——总开关关掉时设置页仍要能用。

## Alternatives considered

**直接实现官方双半路径，赌客户端很快升级** —— 否决。未安装的客户端上该路径无法验证，
写出来的是**死代码**：一条在当前环境永远走不到的分支，恰恰是最容易在升级后暴露问题、
却在此之前零测试覆盖的那种代码。

**两条路径都实现，运行时按能力探测切换** —— 否决。两条路径的**数据模型不同**
（`settingsScope` 的 revision 栅栏 vs 我们的 localStorage 快照），
Host 半还要为 `installSettingsSection` 做命名空间导入的兼容处理。
在没有第二条路径可验证的环境里实现它，等于交付一条无法测试的分支。
探测点（`ctx.slots.spec('settings.plugin.item')`）已记录在迁移方案里，
届时切换是一次显式改动，而不是一次隐式行为变化。

**用 `settings.general.item`（设置"通用"区的一行）** —— 否决。
它只是偏好行，不是一个能承载 8 个字段与实时预览的页面；
且它同样属于 `settings.section` 子树，收益相同而表达力更弱。

## Consequences

- 设置页在当前客户端可用，并有 6 条可执行规格覆盖
  （`tests/settings-panel.spec.tsx`：草稿/保存/取消/恢复默认/预设切换/总开关置灰）。
- 设置项的持久化由插件自持，不受客户端的 settings 文档与 revision 栅栏保护——
  代价是**跨标签页**只能靠 `storage` 事件做最终一致，无法做 revision 级别的冲突合并。
  这是接受"当前客户端唯一可用通道"的直接代价，迁移后自然消失。
- 与 `dsh-brand-studio` 的关系不变：品牌槽 Lumina 以 `-20` 胜出（`-10`），
  设置页是新增的一个独立页面，不影响对方的任何 slot。
- 本次裁决产生的三条文档修订（R-13 patch id 语义、R-14 `inject` 语义、
  R-15 设置页落点）已记入 原文档修订记录（已归档）。
