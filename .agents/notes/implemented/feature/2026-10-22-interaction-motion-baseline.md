# 统一操作反馈与过渡基线

Status: implemented — 2026-10-22

## 决策与范围

用户确认动效选型 1+3 为基线，2 收敛、4 限定品牌。操作反馈和菜单淡入合并在 press 开关，保持原设置结构。普通 composer 按钮 .96 轻按压，发送光环从 520ms 改为 360ms normal，取消卡片闪光。点击确认与 started 去重，键盘发送在 started 补一次。沿用宿主最右可见按钮回退，先判最右按钮再检查禁用；没有宣称获得语义发送钩子。

核实已安装 ui-primitives 的 Menu/MenuSurface CSS 无原生入场动画，数据钩子为 data-menu-material=translucent，增加 140ms normal 纯 opacity 淡入；不移动整表面，不改变关闭卸载时机。DisclosureRow 已有 100ms 透明度过渡，保持原生；侧栏和详情面板暂不改。

移除逐键/流式光环及模型文本 MutationObserver；输入光标常亮 360ms 后恢复呼吸，保留选区、失焦和 IME 回退。品牌扫光 normal 9s，前 70% 静止，输入聚焦或 streaming 时暂停。首屏品牌 opacity + translateY(4px)/scale(.98)，移除模糊。正文不包装 span。

## 验证证据

- 类型检查与构建通过；5 文件 23 测试通过。新增点击与延迟 started 去重、键盘 started、禁用/普通按钮、停止按钮及卸载回归。
- 实际构建 lib/client.js 在隔离 Chrome 的模拟宿主页中执行，React 真运行时、slot 注册为 stub（不代表真实 Harness boot/slot 验收）。加载 id @ratel-works/dsh-lumina，7 样式标签，控制台无警告。
- 菜单 opacity 三采样 0 → .36168 → 1，duration .14s；rect 一直 [130,410,274,132]。
- 点击与流式开始后 ringStarts 均 1；输入时品牌 play-state=paused、光标 steady=true、逐键环节点=0；停顿后 steady=false，离开输入后品牌 running。
- reduce matchMedia=true，菜单和品牌 animation-name=none；卸载后插件样式=0、光环=0、根属性=null。
- 已目检菜单与输入截图；完整采样及验证脚本保存在本次聊天 motion-baseline 可视化目录。
- 重装 desktop/web，需用户完全退出客户端再启动；真实菜单定位、输入法、boot entries 与真实会话切换尚待客户端复核。
- 旧 pulse/typing 原型标记为存档，避免与正式效果混淆。

## Alternatives considered

- 每次 stream start 再播放按钮脉冲：已点击确认的发送会重复，因此保留视觉去重标记。
- 菜单整体 translate/scale：可能建立定位包含块并影响固定后代、锚点和点击桥，采用纯淡入。
- 新增第七开关：菜单属于操作反馈，复用 press，避免无必要的存储 schema 变更。
- 逐键、逐段持续光环：噪声高且需要监视模型文本，因此去掉。
