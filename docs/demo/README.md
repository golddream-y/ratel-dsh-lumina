# Ratel Lumina · Motion Lab

这是动效原型的统一目录。它**不随 npm 包发布**，也不依赖客户端登录或插件加载。

## 入口

```sh
python3 -m http.server 8765 --directory docs/demo
```

打开 <http://127.0.0.1:8765/>。

现有 pulse / typing 页面保留为旧版选型存档；最新实现为单次发送光环、菜单淡入和输入时光标常亮。不要用旧页代替当前客户端验收。

## 当前新会话预览

`particle-stroke.html` 加载实际插件构建。先运行 `npm run build`，再运行 `node tools/serve-motion.mjs`，打开 <http://127.0.0.1:8766/particle-stroke.html>。支持重播、三档节奏、聚合中改变宽度，以及主动画完成后的辅助控件 Echo 入场；系统减少动态直接显示内容。该页必须使用这个服务，普通静态服务不提供实际构建与 React 路径。

## 页面

| 页面 | 内容 |
| --- | --- |
| `particle-stroke.html` | 当前：整个输入框粒子聚合，鲸鱼与标题描边填色，辅助控件最后 Echo 归位，使用实际构建 |
| `compose-entrance.html` | 已替代的 A＋C 联动设计：新字点亮、柔光入场，支持手动输入与减少动态 |
| `index.html` | 原型入口与索引 |
| `pulse.html` | 旧版存档：0.88 缩放 + 520ms 光环 + 卡片柔光 |
| `typing.html` | 旧版存档：逐键柔光；当前基线为输入常亮 360ms |
| `dissolve.html` | 候选模式：文字消解 / 文字合成 |
| `mist.html` | 候选模式：红色雾气飘过 |
| `ghost.html` | 旧版存档：圆润小幽灵三种形态 |
| `glow.html` | 参考：文字辉光 / 流光四种做法 |
| `wave.html` | 候选模式：逐字波浪（输入框 / 流式输出） |

原型页尽量复用正式实现的 CSS keyframes、时长和缓动；差异只在于用静态 mock DOM 代替客户端真实 DOM。
最终验收仍以 desktop 客户端重启后的真实行为为准。

动效素材（只读参考、不引入）见 [动效素材库](../reference/动效素材库.md)。
