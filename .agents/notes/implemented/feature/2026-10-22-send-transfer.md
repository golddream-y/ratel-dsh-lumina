# 发送文字水滴转场实现版

日期：2026-10-22。用户要求直接实现最终目标，不拆成缩放淡出的简化版。

## Decision

新增默认开启的 sendTransfer 独立开关。用可见字素副本实现汇聚、局部 alpha 融合成滴、细颈断开、弧线飞行、落点压扁铺展及逐字展开；与原发送光环互斥。输入框默认混色边、聚焦发光的行为保留。

只消费公开 sessions 与 uiConversation 的只读快照；pending requestId 与用户节点 source.rpcId 建立身份，再用 data-chat-node-key / 会话 data 钩子取落点。相同文字的连续提交按公开 pending 接纳顺序消费手势快照。不访问私有 store、React 内部字段，不改提交、请求、焦点或编辑器内容。

产品需求 C5 已按用户授权加入局部用户文本与排版读取例外；不读取助手正文，不持久化或输出文本。所有候选、滤镜、遮罩与副本有明确时限和清理路径。

## Alternatives considered

- 整块文字缩放后淡出：缺少逐字汇聚、轮廓连接和目标展开，用户已明确拒绝。
- 使用最后一条用户消息或文本相同消息作落点：连续相同提交会错配，拒绝。
- 改宿主提交方法、包裹 Lexical 节点或私有 store：超出增强层边界，拒绝。
- 引入 GSAP / Motion / Three：超出零额外运行时依赖约束，使用平台 SVG、Range 和有限 rAF。
- pending echo 全部猜序号：缺少 requestId DOM 钩子，仅允许 singleton transcript echo，其他情况等待准确用户节点。

## Validation

类型检查、构建及 29 项测试通过。tools/verify-send-transfer.mjs 加载实际构建，在受控浏览器中采样字形 transform、液滴 path、颈部 path 和模糊半径；阶段依次 gather/fuse/detach/fly/unfold。验证卸载、减少动态、切会话、用户滚动、目标丢失、节点替换、目标超时均清空遮罩与副本；下一份草稿不隐藏。

证据目录：本任务可视化目录下 send-transfer/evidence.json、连续 PNG、send-transfer.webp。该动画是受控页面预览，不能称作真实客户端录屏。真实 DSH 加载、视觉和性能预算仍待完整退出重启后验收；安装脚本明确由用户重启客户端。

## Boundaries

没有公开原子提交前钩子，先捕获用户手势可见字形，再等待公开 pending 确认。绑定未就绪、queued/steering、转换后的文本不能验证、落点不可见或超过字形预算时降级。候选最长 1.5 秒，转场硬上限 1.6 秒，最多两条活动装饰、240 个可见字素；不将降级计为完整效果成功。
