# 输入框柔光与激活态优化

Status: implemented — 2026-10-22

## 变更与理由

用户提供实际聚焦与失焦截图：激活态整圈红蓝偏实，光晕在下沿混成紫灰色。将外环改为品牌色/官方蓝与高光白混合的浅色；同一 ::before 内用 padding-box 与 border-box 分开绘制白亮细芯、局部色彩高光和双色底环。总宽 1.75px，不占用宿主 ::after。缩小阴影的偏移、模糊与扩散，保持静态柔光。

聚焦/流式仅环绕高光，透明度固定 .94，不再将底环切成饱和红蓝；闲置呼吸范围 .76–.9。无新增运行时依赖、DOM 或业务监听。

## 验证

- typecheck/build/19 项测试通过。
- 独立 Chrome 长宽比接近用户截图的 fixture：聚焦 angle 三次为 0deg、47.9981deg、146.996deg；streaming 时 2.4s，角度 257.493deg → 324.99deg。
- 闲置 opacity .76 → .785587；各状态 rect 始终 [65,137,1100,152]；pointer-events 为 none，四角/中心命中 DIV。
- reduce matchMedia=true，两次 animation-name=none；根开关关闭后背景和动画均为 none。
- 已目检浅色与深色截图。脚本、采样和前后截图位于本次聊天的 composer-polish 可视化目录。
- fixture 不代表真实宿主验收；本地安装后仍需重启客户端验证输入、IME、boot entries 和控制台。

## Alternatives considered

- 只降低透明度：颜色虽淡，但仍缺少细芯和局部层次。
- 增加伪元素或常驻滤镜：与宿主 ::after 和持续绘制预算冲突。
- 继续放大光晕：会增加下沿混色，因此收紧模糊与扩散。
