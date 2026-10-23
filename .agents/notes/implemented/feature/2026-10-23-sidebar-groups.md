# 分组开合增强

## 决策

只读已安装 app.asar 内 ui-workspace/AnimatedRows，核对 role=tree、workspace/overflow aria-expanded、session treeitem 以及 inert 退出副本。宿主已有提交前快照与 WAAPI 清理，不增加第二套副本。插件只在分组状态改变后调整已验证的两关键帧动画；保留原 onfinish 及取消路径。星河以用户已确认版本为基准。

## Alternatives considered

- 包裹 React 所有的 DOM 并改 height：会与 reconcile、嵌套分组及滚动冲突，放弃。
- 拦截点击并延迟业务状态：影响操作语义，放弃。
- 另建退出副本与 FLIP：重复宿主能力、容易重影，放弃。
- 仅 CSS 入场：覆盖不了已卸载行的退出和下方位移，未选。

## 验证

类型检查、构建、72 项测试通过。真实 bundle 的受控 WAAPI fixture：入场260ms，delay 0/12/24ms；两次 opacity=0/0.597312、top=12/15.58387；退场240ms，副本已清理，三个原生完成回调均执行；减少动态后还原100ms。无页面错误。受控验证不能代替真实 DSH 重启后的嵌套分组和快速反向观感验收。Demo 用简化布局示意节奏，客户端沿用宿主提交生命周期。
