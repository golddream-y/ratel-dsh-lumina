# 客户端比例导致装饰错位

## Decision

统一装饰层和 getBoundingClientRect 的视口坐标。core/viewport.ts 测量自有装饰实际矩形、求轴向比例和偏移，再反向换算 CSS 位置与尺寸。GPU shader/crop/像素预算维持视口单位，DPR 仅影响缓冲区。光带和发送水纹共用校准；监听限 html/body 的 style/class 与 visualViewport resize，绘制循环不新增布局测量。

## Alternatives considered

不按单一 devicePixelRatio 或某个祖先的 computed zoom 推断有效比例，也不只调遮罩偏移补某档缩放。测量适用于轴对齐缩放和平移，任意旋转、斜切不属于支持范围。发送短反馈在播放中改变比例时清除，避免残留。

## Evidence

修改前80%时 crop=(26,300,1414,592)，实际 canvas=(20.8,240,1131.2,473.6)，发生二次缩放。修正后 root/body 分别连续切换67%、80%、100%、120%、150%，画布与crop误差小于0.1 CSS px；顶部64px保护、像素预算满足。水纹80%/120%下圆心误差小于0.05px，宽高相等，pageerrors=[]。90项测试、类型检查、构建通过。本地 desktop/web 已安装；原生结果待用户重启确认，未发布新 npm 版本。
