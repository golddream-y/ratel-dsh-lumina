# 发送水纹反馈

## Decision

按钮水纹独立于发送转场。adapter/send-feedback.ts 从公共 uiSession.current 与 sessions.binding(...).session 订阅 pendingSubmissions，仅将近期本地 click/Enter 与 transcript admission 关联，以 requestId 去重；不读取消息正文，不改宿主提交，不因水滴接管手势或失败回退重播。新建会话保留首发捕获，已有会话切换则清理。

press.ts 用两圈 CSS 伪元素实现 460 ms 主纹与延迟 85 ms 的 485 ms 后续纹，使用主题蓝灰与白色亮边。时长集中在 tokens；鼠标保留 :active 轻压，键盘不模拟按下。减少动态时只短暂静态轮廓。聊天区自动滚动不清掉水纹；装饰锚点实际位移、隐藏、切会话和卸载时清理。

## Alternatives considered

不直接删除 transferOwnsGesture 条件后继续叠加 streaming 和 fallback 通知，那会产生重复与误判。不对每次 Enter 立即播放，也不靠正文是否为空判断附件发送。公共 session 服务缺失时静默跳过此装饰，不回退到猜测发送。小范围水纹采用 CSS，不引入 GPU 或新运行时。

## Evidence

类型检查、构建及 87 项测试通过。实际 bundle 的 Chrome fixture 中，水滴 liquid/off 两种模式均只有两圈水纹；120/260 ms 主圈 scale 1.85→2.12、opacity .52→.08，后圈 scale 1.28→1.77、opacity .28→.07；结束 active 清除。真实 Enter admission 触发，Shift+Enter 换行不触发；减少动态无圈动画且有静态 outline，pageerrors=[]。原生客户端视觉仍待用户完整重启确认。

## 圆形轮廓细化

用户反馈水纹不像圆。移除上下边的分色及宽径向亮圈，改为连续蓝灰轮廓，内侧仅保留弱反光；根节点及两个伪元素明确使用正方形、50% 圆角与等比缩放。受控浏览器 120/260 ms 计算样式宽高均 40px，圆角均 50%，transform 的 X/Y 缩放相等，未发现几何拉伸。该验证不能排除真实客户端的宿主样式影响，原生观感仍需重启确认；不把白底视觉缺口断言为唯一原因。
