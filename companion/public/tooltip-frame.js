/* Provider-owned document. No access to parent DOM, storage, or profile data.
 * Only documented embed scripts run here; no data endpoints are called by Gregular. */
(() => {
  const query = new URLSearchParams(location.search);
  const provider = query.get("provider");
  if (!["foreverdb", "wow-forever"].includes(provider)) return;
  const ids = [...new Set((query.get("ids") || "").split(",").map(Number).filter(id => Number.isSafeInteger(id) && id > 0))].slice(0, 12);
  if (!ids.length) return;
  const iconMode = query.get("icons") === "1" && provider === "foreverdb";
  const status = document.getElementById("status");
  const href = id => provider === "foreverdb" ? `https://foreverdb.net/item/${id}` : `https://wow-forever.gg/db/items/${id}/`;
  const anchor = document.getElementById("item");
  anchor.href = href(ids[0]); anchor.textContent = `Inspect item ${ids[0]} ↗`;
  anchor.dataset.itemId = String(ids[0]);
  if (iconMode) for (const id of ids.slice(1)) {
    const link = document.createElement("a"); link.href = href(id); link.textContent = `Item ${id}`; link.dataset.itemId = String(id); document.body.append(link);
  }
  const send = message => parent.postMessage(message, "*");
  const seen = new Set();
  const observer = new MutationObserver(() => {
    for (const link of document.querySelectorAll("a[data-item-id]")) {
      const img = link.querySelector("img[data-foreverdb-icon]");
      if (!img || seen.has(`${link.dataset.itemId}:${img.src}`) || !/^https:\/\/foreverdb\.net\/icons\/(?!134400\.webp$)[1-9]\d*\.webp$/.test(img.src)) continue;
      const report = () => { if (img.naturalWidth > 0 && !seen.has(`${link.dataset.itemId}:${img.src}`)) { seen.add(`${link.dataset.itemId}:${img.src}`); send({ type: "gregular-icon", id: Number(link.dataset.itemId), url: img.src }); } };
      img.addEventListener("load", report, { once: true }); report();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  const script = document.createElement("script");
  script.src = provider === "foreverdb" ? "https://foreverdb.net/embed/tooltips.js" : "https://wow-forever.gg/embed/tooltips.js";
  script.referrerPolicy = "no-referrer";
  if (provider === "foreverdb") { script.async = true; script.setAttribute("data-icons", "true"); }
  else script.defer = true;
  const timer = setTimeout(() => { status.textContent = "Provider slow or unavailable. Local details remain available outside this panel."; }, 8000);
  script.onload = () => { clearTimeout(timer); status.textContent = "Optional script loaded. Item coverage and provider availability may vary."; };
  script.onerror = () => { clearTimeout(timer); status.textContent = "Provider unavailable. Use Gregular's local item details."; };
  document.body.append(script);
})();
