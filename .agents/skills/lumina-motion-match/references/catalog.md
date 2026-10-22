# 动效预选项 catalog

每行是一个可给开发者点开的候选；URL 优先预览/演示页。
本地 URL 需要先运行：

```sh
python3 -m http.server 8765 --directory docs/demo
```

| id | 意图 | 来源 | 许可证 | 预览 URL | 备注 |
| --- | --- | --- | --- | --- | --- |
| `local-motion-lab` | 总览 | 本项目 | — | <http://127.0.0.1:8765/> | 本地原型入口 |
| `local-pulse` | send / press | 本项目 | — | <http://127.0.0.1:8765/pulse.html> | 发送按钮缩放 + 光环 |
| `local-typing` | typing / keystroke | 本项目 | — | <http://127.0.0.1:8765/typing.html> | 光标柔光，不做 typewriter |
| `anime-stagger` | enter / stagger / timeline / spring | anime.js | MIT | <https://animejs.com/> | 抄错峰和时间线，不引入 |
| `gsap-splittext` | split / reveal / stagger / glow | GSAP SplitText | 免费商用，非 OSI | <https://gsap.com/docs/v3/Plugins/SplitText/> | 控制力最强；不引入 |
| `textillate-shake` | shake / emphasis / error | Textillate | MIT | <https://jschr.github.io/textillate/> | jQuery 老库；只抄效果 |
| `animate-css-shake` | shake / pulse / flash | Animate.css | MIT | <https://animate.style/> | 直接参考 keyframes |
| `reactbits-shiny` | glow / shine / ambient | React Bits | MIT + Commons Clause | <https://reactbits.dev/text-animations/shiny-text> | 参考渐变；不复制源码 |
| `magicui-shiny` | glow / shine | Magic UI | MIT | <https://magicui.design/docs/components/animated-shiny-text> | 参考 CSS 渐变 |
| `magicui-aurora` | glow / gradient / ambient | Magic UI | MIT | <https://magicui.design/docs/components/aurora-text> | 参考极光渐变 |
| `reactbits-glitch` | glitch / error | React Bits | MIT + Commons Clause | <https://reactbits.dev/text-animations/glitch-text> | 参考错位/裁切 |
| `reactbits-decrypted` | decrypt / scramble / reveal | React Bits | MIT + Commons Clause | <https://reactbits.dev/text-animations/decrypted-text> | 参考逐字替换节奏 |
| `forging-fire` | fire / ember | forging-fire-text-effects | ISC | <https://github.com/darrelldresner/forging-fire-text-effects> | 小众；只参考 |
| `flame-text` | fire / canvas | @codebystella/flame-text | MIT | <https://www.npmjs.com/package/@codebystella/flame-text> | 0.x，新；只参考 |
| `typewriter-effect` | typewriter（仅在明确需要时） | typewriter-effect | MIT | <https://github.com/tameemsafi/typewriterjs> | 本项目默认不需要 typewriter |

## 匹配提示

- **shake** → `textillate-shake` / `animate-css-shake`，实现用自写 `translate/rotate` keyframes。
- **fire** → `forging-fire` / `flame-text` 看视觉；实现优先 CSS 多层 `text-shadow` + `flicker`。
- **glow** → `magicui-shiny` / `magicui-aurora` / `reactbits-shiny`；实现用 `text-shadow` 或 `background-clip`。
- **glitch** → `reactbits-glitch`；实现用两份错位文本 + `clip-path`。
- **typing** → `local-typing`；不要给输入框逐字包 span。
- **send** → `local-pulse`；点击时按钮缩放 + 固定光环。
