# Instagram 图片保存

给 Instagram 网页版加一个「一键保存原图」按钮的 Chrome 扩展，附带一个 Codex skill。

刷到喜欢的图，鼠标移上去，右上角出现下载按钮，点一下就存到本地——不用截图，也不用开开发者工具。

## 装上扩展

1. 打开 `chrome://extensions`，开启右上角「开发者模式」
2. 点「加载未打包的扩展程序」
3. 选中本仓库的 `assets/chrome-extension` 文件夹
4. 刷新 `instagram.com`

## 怎么用

鼠标移到任意一张大图上，右上角出现圆形下载按钮，点一下，原图存到 `下载/Instagram`。

- 只给渲染尺寸 120px 以上的图加按钮，头像这类小图会跳过
- 存的是页面里最大尺寸的原图，不是屏幕上看到的缩略图
- 文件名形如 `ins-20261015-151504-fby2.jpg`，中间那串是保存时刻

## 作为 Codex skill 使用

把整个文件夹放进 `~/.codex/skills/`，之后用 `$instagram-photo-saver` 触发。
`SKILL.md` 里是完整的安装流程、硬性约束和排查手册。

## 离线验证

不需要 Instagram 账号就能验证扩展本身：

```bash
npm i -D playwright
node scripts/rehearse.mjs
```

它会起一个仿 Instagram 页面，把扩展真装进一个临时 Chrome，断言按钮注入、原图尺寸选择和文件落盘。

## 已知的坑

`references/troubleshooting.md` 按报错原文索引了这套东西在 macOS 上的已知问题，
包括 Chrome 137+ 移除 `--load-extension`、Playwright 默认禁用扩展，
以及 macOS 隐私保护导致「后台脚本自动搬运文件」方案不成立的原因。

## 许可

MIT
