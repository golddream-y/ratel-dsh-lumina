# 水滴转场在真实客户端不触发的根因：当前会话取错

日期：2026-10-22。用户反馈真实客户端完全没有水滴效果。

## 根因

适配层把"当前会话 id"读成了 `sessions.list.getSnapshot().current`。

客户端 `sessions.list` 是会话目录，其快照结构为 `{ ids, byId, phase, projectionsBySession }`，**没有 `current` 字段**；`getSnapshot().current` 永远是 `undefined`。因此 `bind()` 每次都走 `if (!current) { reportTransferStatus('waiting'); return }`，桥接层永远停在 `waiting`，手势快照无法与 pending 提交配对，转场永远不会启动。

对照客户端源码，当前会话的唯一公开身份是 `uiSession.current.getSnapshot().key`（`uiSession` 是官方客户端服务，官方插件普遍 inject 它）。会话本体仍取 `sessions.binding(id).session`（该对象公开 `getSnapshot()` 与 `subscribe()`），对话视图仍取 `uiConversation.binding(id).target('chat')`（快照含 `order` 与 `nodes.get(key).data.source.rpcId`，与实现一致）。

## 修复

- `TransferServices` 增加 `uiSession.current`，移除对 `sessions.list.current` 的依赖；
- `bind()` 改用 `ui.current.getSnapshot().key` 作为当前会话 id；
- 订阅 `uiSession.current` 取代 `sessions.list` 的切换监听；
- 客户端 `inject` 增加 `uiSession`；
- 测试夹具改为真实结构，并新增回归用例。

## 验证

类型检查、构建、37 项单元测试通过。

## 边界

本修复只解决"永不启动"。真实客户端的视觉、落点关联（A5）、无缝交接（A7）与性能（A10）仍需在完整退出重启后实机验收；受控浏览器预览不能替代。
