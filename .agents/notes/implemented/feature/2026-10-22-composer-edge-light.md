# 输入框流光与 README 视觉对齐

Status: implemented — 2026-10-22

## 变更与理由

旧实现只有固定渐变环加整圈蓝色阴影呼吸。现在使用 1.5px 双色底环叠加环绕高光，左右柔光静态绘制；闲置时只动画边缘透明度，聚焦后环绕，流式时加速。默认 deepseek 预设左暖右冷，左侧随品牌切换。高光白色通过 `--lumina-hi` 发布。设置页预览复用 composerCss。

旧流式选择器将两个实际同在 html 的状态属性当成两层祖先，导致规则不匹配；改用 card 的祖先状态匹配，流式规则优先于聚焦。保留宿主 ::after，不新增 DOM，pointer-events 为 none。card 不再承载呼吸动画，避免与发送闪光争用 animation。减少动态时关闭相关动画。

## 验证证据

- 类型检查、构建、19 项测试通过。
- 独立 Chrome fixture 加载源码 CSS；闲置 opacity `0.62 → 0.689433`；聚焦 angle `0deg → 48.0029deg`，duration `4s`；streaming angle `92.5044deg → 160.003deg`，duration `2.4s`。
- reduce matchMedia 为 true；两次 animation-name 均 none，angle 均 0deg。
- 卡片 rect 始终 `[65,167,760,205]`；伪元素 pointer-events 为 none；四角和中心 hit-test 均为底层 DIV。关闭根开关后背景和动画均为 none。
- 已目检浅色聚焦与深色静态截图。完整采样、脚本、改前/改后截图保存在本次聊天的 composer-review 可视化目录。
- 已重装 desktop 和 web；需客户端完全退出重启后加载。宿主 boot entries、控制台和真实输入/IME 尚未复测，fixture 不代替宿主验收。

## Alternatives considered

- 只增强旧阴影：仍缺少双色层次和聚焦流光。
- 旋转整个矩形：底色漂移，圆角错位。
- 复制宣传图的大幅外延光带：超出输入区域，增加干扰与绘制面积；保留局部细边与柔光。
