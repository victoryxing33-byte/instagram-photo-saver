(() => {
  const MIN_SIZE = 120;
  const CDN = /(cdninstagram\.com|fbcdn\.net)/i;
  const ICON_DOWNLOAD =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 12 5 5 5-5"/><path d="M4 21h16"/></svg>';
  const ICON_DONE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12.5 5 5L20 6.5"/></svg>';

  let enabled = true;

  chrome.storage.local.get({ enabled: true }, (res) => {
    enabled = res.enabled !== false;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.enabled) {
      enabled = changes.enabled.newValue !== false;
    }
  });

  function bestUrl(img) {
    const candidates = [];
    const srcset = img.getAttribute("srcset") || "";
    for (const part of srcset.split(",")) {
      const m = part.trim().match(/^(\S+)\s+(\d+)w$/);
      if (m && CDN.test(m[1])) candidates.push({ url: m[1], w: parseInt(m[2], 10) });
    }
    if (candidates.length) {
      candidates.sort((a, b) => b.w - a.w || isJpg(b.url) - isJpg(a.url));
      return candidates[0].url;
    }
    const single = img.currentSrc || img.src || img.getAttribute("src") || "";
    return CDN.test(single) ? single : "";
  }

  function isJpg(url) {
    return /\.jpe?g(\?|$)/i.test(url) ? 1 : 0;
  }

  function shortcode() {
    const m = location.pathname.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
    return m ? m[1] : "";
  }

  function isCandidate(img) {
    if (!img || !img.isConnected) return false;
    if (img.dataset.insSaveBound === "1") return false;
    const rect = img.getBoundingClientRect();
    if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) return false;
    return !!bestUrl(img);
  }

  function mark(btn, ok) {
    if (!ok) {
      btn.style.background = "rgba(190, 40, 40, 0.92)";
      btn.style.opacity = "1";
      setTimeout(() => {
        btn.style.background = "";
        btn.style.opacity = "";
      }, 1200);
      return;
    }
    btn.classList.add("ins-save-done");
    btn.innerHTML = ICON_DONE;
    setTimeout(() => {
      btn.classList.remove("ins-save-done");
      btn.innerHTML = ICON_DOWNLOAD;
    }, 1200);
  }

  function save(btn, img) {
    const url = bestUrl(img);
    if (!url) {
      mark(btn, false);
      return;
    }
    chrome.runtime.sendMessage({ type: "INS_SAVE_IMAGE", url, shortcode: shortcode() }, (res) => {
      mark(btn, !!(res && res.ok) && !chrome.runtime.lastError);
    });
  }

  function attach(img) {
    if (!isCandidate(img)) return;
    const host = img.parentElement;
    if (!host) return;

    img.dataset.insSaveBound = "1";
    if (getComputedStyle(host).position === "static") {
      host.style.position = "relative";
      host.classList.add("ins-save-host");
    } else {
      host.classList.add("ins-save-host");
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ins-save-btn";
    btn.title = "保存这张图片";
    btn.setAttribute("aria-label", "保存这张图片");
    btn.innerHTML = ICON_DOWNLOAD;
    if (img.getBoundingClientRect().width >= 320) {
      btn.classList.add("ins-save-always");
    }

    const stop = (e) => {
      e.stopPropagation();
    };
    btn.addEventListener("mousedown", stop);
    btn.addEventListener("mouseup", stop);
    btn.addEventListener("pointerdown", stop);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!enabled) return;
      save(btn, img);
    });

    host.appendChild(btn);
  }

  function scan() {
    if (!enabled) return;
    const nodes = document.querySelectorAll("img:not([data-ins-save-bound])");
    for (const img of nodes) {
      if (img.complete) {
        attach(img);
      } else {
        img.addEventListener("load", () => attach(img), { once: true });
      }
    }
  }

  let timer = null;
  function schedule() {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      scan();
    }, 400);
  }

  const observer = new MutationObserver(schedule);
  const start = () => {
    scan();
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });

  document.addEventListener("scroll", schedule, { passive: true, capture: true });
  window.addEventListener("resize", schedule, { passive: true });
})();
