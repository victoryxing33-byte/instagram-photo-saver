#!/usr/bin/env node
/**
 * 校验 background.js 的文件名规则，不需要启动浏览器。
 *
 * 为什么单独测：Playwright 会拦截浏览器下载并把它重命名成 UUID，
 * 所以离线演练里看不到真实文件名，只能这样验。
 *
 * 用法: node scripts/check-filename.mjs
 */

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let listener = null;
const captured = [];

globalThis.chrome = {
  runtime: {
    lastError: undefined,
    onMessage: { addListener: (fn) => { listener = fn; } },
  },
  storage: {
    local: { get: (defaults, cb) => cb(defaults) },
  },
  downloads: {
    download: (opts, cb) => { captured.push(opts); cb(1); },
  },
};

require(path.join(ROOT, "assets", "chrome-extension", "background.js"));

if (!listener) {
  console.error("失败：background.js 没有注册消息监听器");
  process.exit(1);
}

const cases = [
  {
    name: "带 shortcode 的原图",
    msg: {
      type: "INS_SAVE_IMAGE",
      url: "https://scontent.cdninstagram.com/v/t51.2885-15/abc_n.jpg?stp=dst-jpg",
      shortcode: "C9xYzAbCdEf",
    },
    expect: (f) => /^Instagram\/ins-\d{8}-\d{6}-C9xYzAbCdEf\.jpg$/.test(f),
  },
  {
    name: "没有 shortcode 时用随机后缀",
    msg: {
      type: "INS_SAVE_IMAGE",
      url: "https://scontent.cdninstagram.com/v/t51.2885-15/abc_n.jpg",
      shortcode: "",
    },
    expect: (f) => /^Instagram\/ins-\d{8}-\d{6}-[a-z0-9]{4}\.jpg$/.test(f),
  },
  {
    name: "webp 保留扩展名",
    msg: {
      type: "INS_SAVE_IMAGE",
      url: "https://scontent.cdninstagram.com/v/t51.2885-15/abc_n.webp",
      shortcode: "AAA",
    },
    expect: (f) => f.endsWith(".webp"),
  },
  {
    name: "非 http 地址应当被拒绝",
    msg: { type: "INS_SAVE_IMAGE", url: "not-a-url", shortcode: "" },
    expect: null,
  },
  {
    name: "无关消息应当被忽略",
    msg: { type: "SOMETHING_ELSE" },
    expect: null,
  },
];

let failed = 0;

for (const c of cases) {
  const before = captured.length;
  listener(c.msg, {}, () => {});
  const opts = captured[before];

  if (c.expect === null) {
    const ok = !opts;
    if (!ok) failed++;
    console.log(`${ok ? "通过" : "失败"}  ${c.name}${ok ? "" : "（不该触发下载）"}`);
    continue;
  }

  if (!opts) {
    failed++;
    console.log(`失败  ${c.name}（没有触发下载）`);
    continue;
  }

  const ok = c.expect(opts.filename) && opts.conflictAction === "uniquify";
  if (!ok) failed++;
  console.log(`${ok ? "通过" : "失败"}  ${c.name}  ->  ${opts.filename}`);
}

console.log(failed === 0 ? "\n文件名规则全部通过" : `\n${failed} 项失败`);
process.exit(failed === 0 ? 0 : 1);
