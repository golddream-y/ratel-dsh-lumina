# 聚焦触发与真实沿边流光

Status: implemented — 2026-10-22

## 用户确认与实现

用户反馈前版只有光晕没有可感知的流动，并要求默认不发光，点击输入后才发光。将角度渐变彻底替换为 ::before 上的 64×3px 光带，offset-path:border-box 自动沿 containing block 的实际圆角路径运动。默认/失焦 content none 且不覆盖宿主阴影；focus-within 后柔光和光带出现；streaming 仅在聚焦时加速，不单独激活。

offset-distance 是本轮 M2 明确采用的 offset transform 属性，不触发布局，不动画尺寸或 top/left；不新增 observer/DOM，不占宿主 ::after。减少动态时保持静态聚焦装饰。参考平台属性定义：https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/offset-path 。

## 验证

- 类型检查、构建、23 项测试通过。
- 隔离 Chrome 使用实际源码 CSS。默认和失焦 content none、box-shadow none、animation none；未聚焦 streaming 同样 none。
- 聚焦光带 offset-distance 0%、27.084%、44.5835%、62.4999%、80.8325%。用同一 computed offset-path/offset-distance 的透明探针进行布局测量，中心依次为 [91,137]、[756.808,137]、[1165,170.423]、[831.714,289]、[381.042,289]；探针仅在测试页存在，测后删除。
- 连续真实伪元素截图中可见高光先在顶部、后在底部，确认位置移动；未以单独角度变化作为证据。
- reduce matchMedia=true，animation none；测试截图/脚本位于本次聊天 composer-focus-path 可视化目录。
- 模拟页面不代替真实宿主验收；本地 desktop/web 安装后需重启复核。

## Alternatives considered

- 再增强角度渐变：已有两轮真实反馈不可见，因此换为实际沿边移动的局部光带。
- SVG/新增节点与尺寸 observer：现有 ::before 和 CSS 坐标框可直接跟随圆角，无需额外运行时。
- streaming 即自动发光：用户要求点击后才发光，因此仅聚焦启用。
