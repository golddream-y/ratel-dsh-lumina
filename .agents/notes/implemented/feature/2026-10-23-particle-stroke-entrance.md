# 新会话：整个输入框粒子聚合＋鲸鱼标题描边

用户在真实客户端发现旧 A＋C 入场的错位重影，明确指定 React Bits Particle Text 与 Stroke Text 方向。本次替换旧固定外光响应及上浮：输入框边框、文本、SVG 图标、按钮背景采样为粒子目标；鲸鱼 SVG 路径与标题 SVG text 描边后填色。原生实现，只参考公开视觉与说明，不复制上游组件代码，不新增依赖。

Canvas 绝对定位在宿主卡片内，整体平移天然跟随，无逐帧矩形读取；ResizeObserver、滚动、交互、会话变更和卸载负责结束还原。聚合中点击、输入立即交还控件，已有非空草稿跳过。最多 3600 个粒子、单画布、约 1100ms 后停止 rAF。标题仅在品牌槽旁符合已验证的 HeroShell span 结构时处理；不使用 hash 类名和翻译文本识别。

## Alternatives considered

- 固定在 body 的外光：宿主布局移动时错位，删除。
- Pixel Swap / Pixel Transition：覆盖与揭幕不符合用户指定的细粒子聚合，未选。
- 复制整个可编辑 DOM：会复制选区、事件与编辑器节点，改为采样可见装饰并保留原控件。
- 完整截图或 foreignObject 栅格化：字体、跨域与图像安全限制不稳定，使用本地 Canvas 绘制文字和 SVG 基础图形。复杂 SVG 滤镜、图片与隐藏内容不重建，末段交还真实 DOM。
- 持续鼠标排斥、点击爆散与 idle drift：影响输入目标稳定性，本次只做一次聚合。

## 验证

类型检查、构建与 65 项测试通过。实际客户端 bundle 的受控宿主页面在 1320px 和 390px 检查：粒子墨迹多次采样不同，鲸鱼 dashoffset .462→.036→0，fill-opacity 0→1；标题 dashoffset 419→114→移除。宿主横移后 Canvas 相对卡片偏移不变，无固定坐标重影。输入、尺寸变化均立即清理 Canvas；系统减少动态 canvas=0、animation-name=none。卸载 Canvas、遮罩、标题装饰与样式均为0，无页面错误。

证据在本会话可视化目录 particle-stroke/evidence.json、gather.png、forming.png、settled.png、mobile.png。预览加载实际 lib/client.js，服务为 node tools/serve-motion.mjs（127.0.0.1:8766）；仍不能替代真实 DSH 重启后的视觉、IME 与帧率验收。
