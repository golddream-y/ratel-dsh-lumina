# 输入框流转与呼吸的可见性修复

Status: implemented — 2026-10-22

## 原因与调整

用户实际截图显示淡色描边仍在，但光晕和运动肉眼不可见。上一轮阴影收紧至小偏移/负扩散，呼吸仅 .76→.9，且聚焦时用单独 spin 覆盖了呼吸；白色细芯在浅色底上的局部对比不足。没有实际宿主 computedStyle 采样，不能据截图断言宿主动画被关闭。

扩大方向性静态柔光，边缘宽 2.25px；伪元素增加静态 drop-shadow，使其光晕随 opacity 一起呼吸（滤镜参数不动画）。呼吸改为 .48→1；聚焦和流式同时运行 angle 与 opacity，闲置保持呼吸。局部蓝色高光增强，但浅色双色底环不旋转。发送与菜单反馈不变。

## 证据

- 类型检查、构建、23 项测试通过。
- 隔离 Chrome fixture：闲置 opacity .48→.581155；聚焦 angle 0→47.999→146.996deg，opacity .61427→.872701→.922255；animation-name 同时为 spin、halo。streaming 时长 2.4s/3.6s。
- 连续六帧上缘/外光晕区域（排除输入正文与光标）相邻帧差异>=8/255 的像素分别为 7897、5255、3000、5114、4440，确认绘制变化而非只角度变动。已目检不同帧。
- 卡片 rect 一直 [65,137,1100,152]，装饰 pointer-events none；reduce matchMedia=true，animation-name=none。
- 完整构建在模拟宿主页复测：发送 click 和 stream 后光环计数均为 1；菜单淡入、品牌暂停/恢复、卸载清理通过。模拟页面不代表真实 Harness 宿主验收。
- 连续截图、脚本与采样保存于本次聊天 composer-visible 可视化目录；desktop/web 重装后需客户端重启复核。

## Alternatives considered

- 仅检查 animation-name/角度：无法证明白底上的动效可见，因此增加画面区域像素差异检查。
- 动画 card box-shadow：会增加持续绘制，并与卡片外观耦合；改为静态柔光与装饰 opacity。
- 占用宿主 ::after 或新增 DOM observer：无必要，保持 ::before 单层实现。
