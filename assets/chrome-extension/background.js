const DEFAULT_FOLDER = "Instagram";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== "INS_SAVE_IMAGE") return false;

  const url = String(msg.url || "");
  if (!/^https?:\/\//.test(url)) {
    sendResponse({ ok: false, error: "bad_url" });
    return true;
  }

  chrome.storage.local.get({ folder: DEFAULT_FOLDER }, ({ folder }) => {
    const filename = buildFilename(folder, url, msg.shortcode);
    chrome.downloads.download(
      { url, filename, conflictAction: "uniquify", saveAs: false },
      (downloadId) => {
        const err = chrome.runtime.lastError;
        if (err || downloadId === undefined) {
          sendResponse({ ok: false, error: err ? err.message : "download_failed" });
          return;
        }
        sendResponse({ ok: true, downloadId });
      }
    );
  });

  return true;
});

function buildFilename(folder, url, shortcode) {
  const safeFolder = sanitize(folder) || DEFAULT_FOLDER;
  const ext = extensionOf(url);
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const tail = shortcode ? sanitize(shortcode) : Math.random().toString(36).slice(2, 6);
  return `${safeFolder}/ins-${stamp}-${tail}.${ext}`;
}

function extensionOf(url) {
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch (e) {
    path = url.split("?")[0];
  }
  const m = path.match(/\.(jpe?g|png|webp|heic|heif|gif|mp4)$/i);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

function sanitize(value) {
  return String(value || "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 40);
}
