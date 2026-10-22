# Ratel Lumina · Motion Lab

这是动效原型的统一目录。它**不随 npm 包发布**，也不依赖客户端登录或插件加载。

## 入口

```sh
python3 -m http.server 8765 --directory docs/demo
```

打开 <http://127.0.0.1:8765/>。

## 页面

| 页面 | 内容 |
| --- | --- |
| `index.html` | 原型入口与索引 |
| `pulse.html` | M4 发送按钮按压 + 脉冲 + 卡片柔光 |
| `typing.html` | M3 打字脉冲：光标呼吸 + 输入柔光 |

原型页尽量复用正式实现的 CSS keyframes、时长和缓动；差异只在于用静态 mock DOM 代替客户端真实 DOM。
最终验收仍以 desktop 客户端重启后的真实行为为准。

动效素材（只读参考、不引入）见 [动效素材库](../reference/动效素材库.md)。
