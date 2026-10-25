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

## 页面丝带流光

运行 `npm run build` 与 `node tools/serve-motion.mjs`，打开 <http://127.0.0.1:8766/silk-ribbon.html>。页面使用实际插件构建，可检查聚焦显现、失焦淡出和窗口尺寸变化；原型不发送消息。

- [WebGPU 静态材质样板](http://127.0.0.1:8766/silk-material.html)：与客户端共用渲染内核，默认定格，时间滑块和播放用于比较折面与反光。服务由 `node tools/serve-motion.mjs` 启动。

编辑 `assets/motion/silk-study.svg` 后执行 `npm run gen:silk`，不要直接修改生成的 TypeScript 资产。

- [静态 SVG 美术样板](http://127.0.0.1:8766/silk-art.html)：查看当前美术稿及 README 参考。

`silk-material.html` 与客户端共用 SVG 纹理和 WebGPU 网格渲染；主高光来自 SVG。旧参数曲面实验、上一版对照资产与入口已清理，历史方案可从 Git 查询。

## 发送反馈

[两圈水纹](http://127.0.0.1:8766/send-feedback.html)使用实际 bundle，提供水滴开关对照，可点击发送或 Enter 提交，Shift+Enter 换行。消息仅在本地 fixture 中显示，不发送请求。

缩放回归：启动本地服务后执行 `node tools/verify-viewport-scale.mjs`，可通过 `LUMINA_PLAYWRIGHT_PATH` 指定已有 Playwright 路径。脚本用实际 bundle 检查 html/body 的 67%–150% 连续比例变化、GPU 裁切对齐、顶部排除区和水纹圆心。

## 水滴近景样板

[融合与剥离](http://127.0.0.1:8766/liquid-study.html)直接复用正式 liquid renderer，提供慢放/正常速度、暂停、重播、时间滑块及深浅底对照。水体近景约1.8倍，用于检查材质与连接颈；当前水滴已本地安装并定版，近景放大仅供对照；新增流光模式见下方独立原型。


## 流光发送

[牵出与收尽](http://127.0.0.1:8766/flow-study.html)共用正式 flow renderer，提供实际尺寸、慢放、重播、时间拖动与深浅底对照，不发送请求。默认模式为流光，已有保存的模式选择保持不变。正常档600 ms；验证脚本 `node tools/verify-flow.mjs` 使用实际 bundle 核对流动、消息交接和清理。


首次发送回归：`node tools/verify-first-send.mjs` 检查居中输入框归位、文字同步、重新挂载和取消恢复。可用 `LUMINA_EVIDENCE_DIR` 指向 `.local/diagnostics/`，诊断输出不入库。普通静态发送预览不代表已覆盖首次布局迁移。
