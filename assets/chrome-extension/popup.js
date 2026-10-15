const enabledEl = document.getElementById("enabled");
const folderEl = document.getElementById("folder");
const openBtn = document.getElementById("open");

chrome.storage.local.get({ enabled: true, folder: "Instagram" }, (res) => {
  enabledEl.checked = res.enabled !== false;
  folderEl.value = res.folder;
});

enabledEl.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: enabledEl.checked });
});

folderEl.addEventListener("change", () => {
  chrome.storage.local.set({ folder: folderEl.value.trim() || "Instagram" });
});

openBtn.addEventListener("click", () => {
  chrome.downloads.showDefaultFolder();
});
