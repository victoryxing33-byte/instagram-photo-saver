# 离线演练

真实 Instagram 需要登录，自动化里跑不通，所以用一个仿页面来验证扩展本身。

## 三个条件必须同时满足

因为扩展的 `matches` 写的是 `https://www.instagram.com/*`、脚本里又用 CDN 域名过滤图片，仿页面必须同时满足：

1. **域名对**：页面的主机名要是 `www.instagram.com`，图片地址里要含 `cdninstagram.com`。用 `<img>` 直接引用本地文件是不行的——会被域名过滤挡掉。
2. **协议是 HTTPS**：`instagram.com` 在 HSTS 预加载列表里，`http://` 会被 Chrome 强制升级，本地服务必须支持 TLS，并让浏览器忽略自签证书。
3. **端口不能出现在 URL 里**：匹配模式对端口的处理容易踩坑，所以 URL 保持默认的 443，用 `--host-resolver-rules` 带端口映射把连接改道到本机高位端口：

```
--host-resolver-rules=MAP www.instagram.com:443 127.0.0.1:8443, MAP scontent.cdninstagram.com:443 127.0.0.1:8443
```

这样页面地址是干净的 `https://www.instagram.com/`，匹配模式必然命中，而实际连接落在本机 8443，不需要 root 权限。

## 要断言什么

`scripts/rehearse.mjs` 覆盖这几条：

- 扩展装载成功（CDP 返回了 id），后台 Service Worker 起来了
- 大图被注入了下载按钮
- 小图（42px 头像）被跳过
- 点击按钮后文件真的落盘
- 服务端收到的是 `?w=1080`，说明取的是 `srcset` 里最大的那份，而不是屏幕上看到的缩略图

最后一条是这个扩展的核心价值，值得单独断言。

## 它的局限

- **不能替代真实站点验证。** 仿页面只复刻了结构（`<img>` + `srcset` + CDN 地址），真实 Instagram 的 DOM 完全不同，class 名是混淆过的。好在脚本只依赖 `<img>`、域名和渲染尺寸，不依赖 class，所以结构差异影响有限——但第一次在真站点上用，仍需人工点一张确认。
- **无头模式可用**，Chrome 155 实测通过。早期版本的无头模式不支持扩展，如果失败先换成有窗口模式试。
- **文件名验不了**，原因见 `troubleshooting.md`。
