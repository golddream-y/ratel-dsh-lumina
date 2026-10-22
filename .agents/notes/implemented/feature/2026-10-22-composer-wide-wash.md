# 静态混色细边与宽幅流光

Status: implemented — 2026-10-22

## 用户要求与调整

用户认为 offset-path 胶囊像小物体绕框跑，要求默认不发光但保留混色边框。改为 ::before 全尺寸 mask 薄环，底层始终为静态左暖右冷渐变；上层宽幅、无明确头部的渐变只在聚焦时 background-position 迁移。去掉 offset-path、64px 光点、滤镜。卡片聚焦时加静态方向性柔光，失焦移除阴影与动画但不移除混色环。流式不单独激活光效。

background-position 为文档明确的 M2 paint 例外，仅作用于 1.5px 挖空薄环，不触发布局。设置页复用同一 CSS，未添加 runtime 或节点。

## 验证

- typecheck、build、23 测试通过。
- 隔离 Chrome 实际源码 CSS：闲置两次 position=160%、opacity=.78、animation=none、shadow=none，背景包含混色渐变。
- 聚焦 position 三采样 160%→130.663%→71.9988%，动画为 wash+breathe、时长 6s/3.6s。连续六帧已目检，无独立绕框物体；亮度沿长边大范围迁移。
- 失焦 shadow=none、animation=none，保留背景；reduce matchMedia=true、animation=none；卡片 rect 各状态均 [65,137,1100,152]。
- 脚本、连续帧、采样位于本次聊天 composer-wide-wash 可视化目录。独立 fixture 不等于真实 Harness 客户端视觉验收；重装后需重启复核。

## Alternatives considered

- 继续沿边点光：用户明确否定，取消。
- 默认移除全部装饰：用户明确要求保留混色细边，改为仅关闭阴影与动画。
- 加粒子、独立尾迹或外延光带：增加物体感与干扰，不采用。
