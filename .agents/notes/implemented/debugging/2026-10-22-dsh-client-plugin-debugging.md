# Agent Note: dsh-lumina 客户端插件调试经验

Status: implemented — 2026-10-22 最终定位并修复

这份记录是给下一次改这个插件的人（或模型）的排障路径，不是产品文档。
这次从“插件列表有、设置页没有、效果没有”到最后品牌生效，踩了五个不同的坑；
按下面的顺序查，可以少走很多弯路。

## 1. 先分清 host 状态和 client 状态

- `dsh plugin --profile desktop list` / 插件详情页的“运行中”只说明 **host Loader fiber** 活着；
- 真正决定 UI 的是 **client 半是否执行 `apply`、slot 是否注册、occupant 是否 active**；
- 用 live Inspector 查 client：

```text
cordis_inspect_query(platform=client, provider=Slots, method=listSubTree,
  input={"root":"sidebar.brand.mark"})
cordis_inspect_query(platform=client, provider=Slots, method=listSubTree,
  input={"root":"settings.section"})
```

  Lumina 的品牌 occupant 是 priority `-20`；设置页 occupant id 是 `dsh-lumina`。

⚠️ Inspector 的 Client 可能绑定到另一个页面/旧页面；如果 occupant 和探针矛盾，
优先相信 **localStorage 探针 + 实际 UI**，不要只信 Inspector。

## 2. profile bundle 行会丢

`tools/install-local.sh` 的 `remove → add` 可能只恢复 dependency，不恢复
`dsh.profile.bundles`。症状是“插件列表有、host 没有 `include:ui-lumina`、
client graph 里也没有 `dsh-lumina`”。

检查：

```bash
python3 -c 'import json;d=json.load(open("/Users/golddream/.dsh/profiles/desktop/package.json"));print(d["dsh"]["profile"]["bundles"])'
```

现在脚本在 add 之后会幂等补回 bundle 行。

## 3. 第三方 bundle 不能 require Harness Client 包

`@deepseek-ai/dsh-client-ui-primitives` 在模块表里，但第三方插件规范禁止 require。
Lumina 的内联品牌 SVG 就是为了去掉这个 require；构建产物只允许：

```text
react
react/jsx-runtime
```

`tests/client-bundle.spec.ts` 会守住这条。

## 4. `ctx.effect` 不是 `onDispose`

这是最隐蔽、也最致命的一条：

```ts
// 错：callback 立即执行，等于 apply 内立刻 teardown
ctx.effect(() => {
  unsubscribe()
  removeAllStyles()
}, 'dsh-lumina: teardown')

// 对：callback 立即执行，返回的才是 disposer
ctx.effect(() => () => {
  unsubscribe()
  removeAllStyles()
}, 'dsh-lumina: teardown')
```

错误写法下，slot/styling 刚注册就被自己清掉，且**没有任何异常**。判断方法：
在 teardown 里写一个 probe，如果它和 `apply-done` 同毫秒，就是这个问题。

回归测试：`tests/client-bundle.spec.ts` 的 fake `ctx.effect` 会断言 callback 返回函数。

## 5. slot 声明时序

`ctx.slots.register` 要求 slot 已声明；`inject` 等未来声明。插件可能比 shell 首帧早，
所以统一用 `occupySlot`：先直接 register，失败再 inject。不要在各效果里自己写。

## 6. 页面缓存 / 旧 boot graph

desktop 的 renderer 会复用旧页面；`Cmd+R` 在 desktop 里可能不可用。清理：

```bash
rm -rf "$HOME/Library/Application Support/@deepseek-ai/dsh-desktop/Cache" \
       "$HOME/Library/Application Support/@deepseek-ai/dsh-desktop/Code Cache"
```

然后 `Cmd+Q` 完全退出再打开。判断当前页面是否加载新 bundle 的最可靠办法是
**探针时间戳**，不是重启次数。

探针写到：

```text
~/Library/Application Support/@deepseek-ai/dsh-desktop/Local Storage/leveldb
```

读：

```bash
strings -a -n 4 "$HOME/Library/Application Support/@deepseek-ai/dsh-desktop/Local Storage/leveldb/"* \
  | grep -A2 "dsh-lumina/probe"
```

## 7. 不要碰 `process._linkedBinding`

这次尝试从 host 进程拿 Electron webContents 时用了
`process._linkedBinding('electron_browser_*')`，直接触发宿主 SIGTRAP 崩溃。
客户端排障只用 Inspector / localStorage / Slots provider，不要做进程级绑定探测。

## 8. 品牌字标 viewBox 要覆盖所有字形

`assets/deepseek-harness-logo-v2.svg` 的第一个 `d` 路径从 `x=95.8492` 开始。
最初生成器把 wordmark crop 成 `viewBox="103 28 306 44"`，导致 `d` 左竖被裁
（看起来像 “jeepseek”）。正确：

```text
viewBox="94 28 315 44"
```

`tools/gen-brand-assets.mjs` 固定这个值；改资产后重新 `npm run gen:brand` 并目检
首尾字形与 HARNESS 徽标。
