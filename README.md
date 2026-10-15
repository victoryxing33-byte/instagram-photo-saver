# Instagram Photo Saver

Chrome 浏览器扩展，一键下载 Instagram 图片，无需开发者工具。

## ✨ 功能特点

- 鼠标悬浮大图，右上角出现圆形下载按钮
- 点击即可保存原图到本地
- 自动过滤小尺寸头像（仅 120px 以上图片才显示下载按钮）
- 轻量无广告，不收集用户数据

## 📦 安装教程

1. 打开 Chrome 浏览器，进入扩展管理页面 `chrome://extensions/`
2. 打开右上角【开发者模式】
3. 点击【加载已解压的扩展程序】
4. 选中本仓库里的 `assets/chrome-extension` 文件夹
5. 刷新 Instagram 页面，即可使用

## 📖 使用方法

打开 Instagram，鼠标移动到大图上，右上角会出现下载按钮，点击就能保存原图。

图片默认存到 `下载/Instagram`，文件名形如 `ins-20261015-151504-fby2.jpg`，中间那串是保存时刻。

## 🗂 仓库结构

| 目录 | 内容 |
| --- | --- |
| `assets/chrome-extension/` | 扩展本体，安装教程第 4 步要选的就是它 |
| `scripts/` | 自检脚本，见下面的「如何校对」 |
| `references/` | 排查手册，按报错原文索引了 macOS 上的已知问题 |

这个仓库同时也是一个 Codex skill：把整个文件夹放进 `~/.codex/skills/`，用 `$instagram-photo-saver` 触发。
`SKILL.md` 里是完整的安装流程、硬性约束和排查入口。

## 🔍 如何校对

改完代码后，用下面几步确认它还是能用的。

**1. 文件名规则单测**（零依赖，秒出结果）

```bash
node scripts/check-filename.mjs
```

**2. 完整离线演练**（不需要 Instagram 账号）

```bash
npm i -D playwright
node scripts/rehearse.mjs
```

它会起一个仿 Instagram 的页面，把扩展真装进一个临时 Chrome，断言按钮注入、小图跳过、原图尺寸选择和文件落盘。七项全通过才算好。

**3. 仓库与本地是否一致**

```bash
cd /tmp
curl -sL -o r.tar.gz https://github.com/victoryxing33-byte/instagram-photo-saver/archive/refs/heads/main.tar.gz
tar xzf r.tar.gz
diff -r --exclude=.git <你本地的副本> instagram-photo-saver-main
```

没有输出即完全一致。

**4. 自己当一次陌生人**

打开仓库首页，只看第一屏：能不能回答「这是什么、我装完能得到什么」。

## 📄 License

MIT
