#!/usr/bin/env node
//
// 离线演练：不需要 Instagram 账号，验证扩展能不能注入按钮、能不能把图存下来。
//
// 做法：本地起一个 HTTPS 服务冒充 www.instagram.com 和 scontent.cdninstagram.com，
// 用 --host-resolver-rules 把这两个域名的 443 端口改道到本机端口，
// 再把扩展真装进一个临时 Chrome，走一遍完整流程。
//
// 用法:
//   node scripts/rehearse.mjs
//   PORT=9443 node scripts/rehearse.mjs
//   PLAYWRIGHT_PATH=/path/to/playwright node scripts/rehearse.mjs
//   node scripts/rehearse.mjs --keep        保留临时目录便于排查
//
// 依赖 playwright（只有这个脚本需要，扩展本身零依赖）和 openssl（macOS 自带）。
//

import { createRequire } from "node:module";
import https from "node:https";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXT = path.join(ROOT, "assets", "chrome-extension");
const KEEP = process.argv.includes("--keep");
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), "ins-rehearse-"));
const PROFILE = path.join(WORK, "profile");
const DOWNLOADS = path.join(WORK, "downloads");
const PORT = Number(process.env.PORT || 8443);
const PAGE_URL = "https://www.instagram.com/";
const CHROME =
  process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// 一张 303 字节的占位图，避免脚本依赖任何图像库
const DEMO_JPEG = Buffer.from(
  "/9j/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCABAADADASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAEF/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/EABYBAQEBAAAAAAAAAAAAAAAAAAACBP/EABURAQEAAAAAAAAAAAAAAAAAAAAB/9oADAMBAAIRAxEAPwDAAbWOQAFSAAuQAESAAqQAFwAESAAqQQBcigCJBFQVIAC5H//Z",
  "base64"
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hits = [];

function loadPlaywright() {
  const tries = [];
  if (process.env.PLAYWRIGHT_PATH) tries.push(process.env.PLAYWRIGHT_PATH);
  tries.push("playwright");
  if (process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) {
    tries.push(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, "playwright"));
  }
  for (const t of tries) {
    try {
      return require(t);
    } catch (e) {
      // 换下一个候选
    }
  }
  throw new Error(
    "找不到 playwright。先 npm i -D playwright，或用 PLAYWRIGHT_PATH 指向已装好的 playwright 目录。"
  );
}

function makeCert() {
  const key = path.join(WORK, "key.pem");
  const crt = path.join(WORK, "cert.pem");
  execFileSync(
    "/usr/bin/openssl",
    [
      "req", "-x509", "-newkey", "rsa:2048", "-nodes",
      "-keyout", key, "-out", crt, "-days", "2",
      "-subj", "/CN=www.instagram.com",
      "-addext", "subjectAltName=DNS:www.instagram.com,DNS:scontent.cdninstagram.com",
    ],
    { stdio: "pipe" }
  );
  return { key: fs.readFileSync(key), cert: fs.readFileSync(crt) };
}

function mockHtml() {
  const cdn = "https://scontent.cdninstagram.com/v/t51.2885-15/demo.jpg";
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>Instagram</title>
<style>
  body{margin:0;background:#000;color:#f5f5f5;font-family:-apple-system,"PingFang SC",sans-serif}
  .feed{width:470px;margin:24px auto}
  .head{display:flex;align-items:center;gap:10px;padding:10px 0}
  .head img{width:42px;height:42px;border-radius:50%}
  .photo img{width:100%;display:block}
</style></head>
<body><div class="feed">
  <div class="post">
    <div class="head">
      <img src="${cdn}?avatar=1" alt="demo_user 的头像">
      <div>demo_user</div>
    </div>
    <div class="photo">
      <img alt="Photo by demo_user"
           src="${cdn}?w=640"
           srcset="${cdn}?w=640 640w, ${cdn}?w=1080 1080w">
    </div>
  </div>
</div></body></html>`;
}

function startServer() {
  const { key, cert } = makeCert();
  const server = https.createServer({ key, cert }, (req, res) => {
    const host = String(req.headers.host || "").split(":")[0].toLowerCase();
    const urlPath = req.url.split("?")[0];
    hits.push(req.headers.host + req.url);

    if (host.endsWith("cdninstagram.com")) {
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      res.end(DEMO_JPEG);
      return;
    }
    if (urlPath === "/" || urlPath === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(mockHtml());
      return;
    }
    res.writeHead(404);
    res.end();
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "通过" : "失败"}  ${name}${detail ? "  " + detail : ""}`);
};

async function main() {
  const { chromium } = loadPlaywright();
  fs.mkdirSync(DOWNLOADS, { recursive: true });

  const server = await startServer();
  console.log(`本地演练服务已启动 127.0.0.1:${PORT}`);

  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CHROME,
    headless: true,
    viewport: { width: 1120, height: 900 },
    deviceScaleFactor: 2,
    downloadsPath: DOWNLOADS,
    // 不排除这个默认参数，扩展会静默不加载
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      `--host-resolver-rules=MAP www.instagram.com:443 127.0.0.1:${PORT}, MAP scontent.cdninstagram.com:443 127.0.0.1:${PORT}`,
      "--ignore-certificate-errors",
      "--no-first-run",
      "--no-default-browser-check",
    ],
  });

  const session = await ctx.browser().newBrowserCDPSession();
  const { id: extId } = await session.send("Extensions.loadUnpacked", { path: EXT });
  await sleep(1200);
  check("扩展已装载", Boolean(extId), `id=${String(extId).slice(0, 8)}…`);
  check("后台 Service Worker 已启动", ctx.serviceWorkers().length > 0);

  for (const p of ctx.pages()) await p.close().catch(() => {});
  const page = await ctx.newPage();
  await page.goto(PAGE_URL, { waitUntil: "load" });

  let injected = 0;
  try {
    await page.waitForSelector(".ins-save-btn", { timeout: 10000 });
    injected = await page.locator(".ins-save-btn").count();
  } catch (e) {
    // 由下面的断言统一报告
  }
  check("大图注入了下载按钮", injected >= 1, `按钮数=${injected}`);

  const shape = await page.evaluate(() =>
    Array.from(document.images).map((im) => {
      const r = im.getBoundingClientRect();
      return {
        box: `${Math.round(r.width)}x${Math.round(r.height)}`,
        hasButton: Boolean(
          im.parentElement && im.parentElement.querySelector(".ins-save-btn")
        ),
      };
    })
  );
  check("小图（头像）自动跳过", shape[0] && !shape[0].hasButton, `尺寸=${shape[0] && shape[0].box}`);
  check("大图有按钮", shape[1] && shape[1].hasButton, `尺寸=${shape[1] && shape[1].box}`);

  if (injected >= 1) {
    const before = fs.readdirSync(DOWNLOADS).length;
    await page.locator(".ins-save-btn").first().click();
    let after = before;
    for (let i = 0; i < 40 && after === before; i++) {
      await sleep(300);
      after = fs.readdirSync(DOWNLOADS).length;
    }
    check("点击后文件真的落盘", after > before);
    check(
      "取的是 srcset 里最大尺寸（1080w）",
      hits.some((h) => h.includes("demo.jpg?w=1080"))
    );
  }

  await ctx.close();
  server.close();

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} 项通过`);
  console.log(`临时目录: ${WORK}${KEEP ? "" : "（已删除，加 --keep 可保留）"}`);
  if (!KEEP) fs.rmSync(WORK, { recursive: true, force: true });
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("演练失败: " + (e && e.stack ? e.stack : e));
  console.error(`临时目录保留在: ${WORK}`);
  process.exit(1);
});
