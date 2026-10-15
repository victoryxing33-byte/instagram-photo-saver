---
name: instagram-photo-saver
description: 在 macOS 上给用户的 Chrome 装一个本地扩展，让他在 Instagram 网页上把任意图片一键存到固定目录。当用户说「刷 ins 时想随手存图」「保存 Instagram 图片」「存下来的图去哪了」「换个保存位置」时使用。不适用于下载视频或 Reels、批量抓取账号，也不适用于非 Chrome 浏览器（Safari 装不了这类未打包扩展）。
---

# Instagram 图片一键保存

把 `assets/chrome-extension/` 这个未打包的 Chrome 扩展装到用户的 Chrome 里。装完后，用户在 `instagram.com` 任意一张大图上悬停，右上角会出现圆形下载按钮，点一下原图就落到本地固定目录。

## 交付标准

做完时应当满足：用户打开已登录的 `instagram.com`，页面上尺寸 ≥ 120px 的图片右上角都有按钮，点一下图片真的落盘，且用户清楚知道去哪找。

## 安装

给真实用户安装走界面，不要把扩展注入到他已经开着的 Chrome（那条路需要他自己用调试端口重启浏览器）。

1. 打开 `chrome://extensions`，开启右上角「开发者模式」
2. 点「加载未打包的扩展程序」
3. 在弹出的**文件夹选择框**里选中 `assets/chrome-extension` 这一层文件夹，点「选择」
4. 让用户刷新 `instagram.com`

第 3 步是整个流程唯一容易翻车的地方，报错样子见 `references/troubleshooting.md` 的「选错目录层级」。

## 不可绕过的约束

这几条都是实测撞出来的，换方案前先读完：

1. **扩展下载只能写进浏览器的下载目录。** `chrome.downloads.download` 的 `filename` 只接受相对于下载目录的路径，绝对路径和 `..` 会直接报错。所以图片永远先落在「下载」里，做不到直接写桌面。
2. **不要在下载路径中间放软链接。** Chrome 解析目标路径时遇到软链接，会把文件甩到软链接的上一级目录，而不是软链接指向的位置。想在桌面开个入口，正确做法是桌面放软链接指向下载目录（写入路径本身仍是真实目录），不要反过来。
3. **不要用 launchd 之类的后台脚本搬运文件。** macOS 隐私保护允许后台任务写桌面，但拒绝它读取「下载」文件夹，实测报 `ls: .../Downloads/xxx: Operation not permitted`。探索过程记在 `references/troubleshooting.md`。
4. **用 Playwright 自动化时，它的默认参数里带着 `--disable-extensions`**，必须用 `ignoreDefaultArgs: ["--disable-extensions"]` 排除掉，否则扩展会静默不加载，表现为「一切正常但页面上没有按钮」。
5. **Chrome 137+ 已移除 `--load-extension`。** 需要在自动化实例里加载扩展时，只能走 CDP 的 `Extensions.loadUnpacked`，见 `scripts/rehearse.mjs`。

## 保存目录

默认存到 `下载/Instagram`，文件名形如 `ins-20261015-151504-fby2.jpg`（中间是保存时刻，末尾优先用帖子 shortcode，取不到时用随机字符）。

想让用户在桌面上也能直接打开这个目录，跑 `scripts/setup-desktop-entry.sh`。它只创建入口，不改变文件的真实存放位置。

在插件图标弹出的面板里可以改子目录名，或临时关掉按钮。

## 验证

真实 Instagram 需要登录，自动化里跑不通。用 `scripts/rehearse.mjs` 做离线演练：它起一个仿 Instagram 页面，把扩展真装进一个临时 Chrome，断言按钮注入、原图尺寸选择和文件落盘。原理见 `references/verification.md`。

## 参考资料

- `references/troubleshooting.md` — 按报错原文索引的排查手册
- `references/verification.md` — 离线演练的原理和它的局限
