# 排查手册

按你看到的现象查。

## 页面上没有按钮

依次排除：

1. **扩展根本没加载。** 打开 `chrome://extensions`，看列表里有没有「Instagram 图片保存」，开关是不是开着。
2. **页面没刷新。** 装完扩展后，之前已经打开的 Instagram 标签页必须刷新才生效。
3. **图片太小。** 脚本只给渲染尺寸 ≥ 120px 的图加按钮，头像会被跳过，这是故意的。
4. **在用自动化跑（Playwright）。** 它的默认启动参数里带 `--disable-extensions`，扩展会静默不加载，日志、报错什么都没有。必须 `ignoreDefaultArgs: ["--disable-extensions"]`。

## `未能成功加载扩展程序` / `清单文件缺失或不可读取`

文件夹选择框里选错层级了，把上一层目录（比如 `outputs`）当成了扩展目录。

这个框的行为有个坑：用 `Cmd+Shift+G` 输入路径后，连按两次回车，确认的是**当前所在的目录**，不是路径字符串对应的目录。稳妥做法是——先跳到父目录，等列表刷出来，在列表里点中扩展文件夹本身（会高亮），再点「选择」。

## 图片没进文件夹，反而散落在桌面根目录

下载路径中间有软链接。Chrome 解析目标路径时遇到软链接，会把文件写到软链接的**上一级目录**，而不是它指向的位置。

正确方向是反过来的：写入路径保持真实目录（`下载/Instagram`），只在桌面放一个软链接指向它。见 `scripts/setup-desktop-entry.sh`。

## 后台脚本报 `Operation not permitted`

```
ls: /Users/<you>/Downloads/Instagram: Operation not permitted
```

macOS 隐私保护（TCC）。实测结论：

| 后台任务能做的 | 后台任务做不了的 |
| --- | --- |
| 写桌面文件夹 | 读取「下载」文件夹 |

所以「后台脚本监听下载目录、自动把图搬到桌面」这个思路在 macOS 上不成立——服务端（Chrome）只能写「下载」，搬运方读不到「下载」，两头夹死。别在这上面花时间。

（判定方法：写个探针脚本挂到 `LaunchAgent` 上，里面分别 `ls` 下载目录和 `touch` 桌面文件，看哪个报错。日志走 `StandardOutPath`。）

## 离线演练报 `ERR_SSL_PROTOCOL_ERROR`

`instagram.com` 在浏览器 HSTS 预加载列表里，Chrome 会把任何 `http://` 请求强制升级成 `https://`，所以本地服务必须上 TLS。

解法：`openssl` 自签一张带 `subjectAltName` 的证书，浏览器启动参数加 `--ignore-certificate-errors`。`scripts/rehearse.mjs` 已经处理好了。

## 演练里下载的文件名变成了 UUID

Playwright 会拦截浏览器下载并重命名，`chrome.downloads.download` 里的文件名不会落到磁盘上。

所以文件名规则要单独测：`scripts/check-filename.mjs` 用桩替换掉 `chrome` 对象，直接调 `background.js` 的消息处理函数，断言生成的路径。

## 存下来的是 `.webp`，「照片」App 导入不了

macOS 的「照片」不支持 WebP。脚本已经在选候选地址时优先挑 `.jpg`，但少数帖子只有 WebP 时仍会拿到它。遇到这种图，打开该帖的详情页再存一次，通常就有 jpg 了。

## Chrome 137 之后 `--load-extension` 不生效

该命令行开关已被移除，加了也不会加载扩展。替代方案是 CDP 命令 `Extensions.loadUnpacked`（需要在自动化实例里做，见 `scripts/rehearse.mjs`）。

注意它只影响**你启动的那个实例**。给真实用户装扩展，还是得走 `chrome://extensions` 界面，因为用户自己开的 Chrome 没有开调试端口。
