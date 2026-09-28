function createAdsgramClickTracker() {
  const shown = new Set(), clicked = new Set(), urls = [];
  let oFetch, oOpen, oSend, oBeacon, active = false;

  const record = (url) => {
    if (!url || !String(url).includes("api.adsgram.ai/event")) return;
    const u = String(url);
    const id = (u.match(/[?&]record=([^&]+)/) || [])[1] || u;
    const type = u.includes("type=Click") ? "Click" : u.includes("type=Show") ? "Show" : "other";
    if (type === "Show")  shown.add(id);
    if (type === "Click") clicked.add(id);
    urls.push(type + " " + u.slice(0, 110));
    console.log("[AdTracker]", type);
  };
  return {
    start() {
      if (active) return; active = true;
      oFetch = window.fetch;
      window.fetch = function (input, init) {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input?.url;
        try { record(url); } catch {}
        return oFetch.call(window, input, init);
      };
      const X = XMLHttpRequest.prototype;
      oOpen = X.open; oSend = X.send;
      X.open = function (m, u) { this.__u = String(u); return oOpen.apply(this, arguments); };
      X.send = function () { try { record(this.__u); } catch {} return oSend.apply(this, arguments); };
      oBeacon = navigator.sendBeacon;
      if (oBeacon) navigator.sendBeacon = function (u, d) { try { record(String(u)); } catch {} return oBeacon.call(navigator, u, d); };
    },
    stop() {
      if (!active) return; active = false;
      window.fetch = oFetch;
      XMLHttpRequest.prototype.open = oOpen;
      XMLHttpRequest.prototype.send = oSend;
      if (oBeacon) navigator.sendBeacon = oBeacon;
    },
    summary: () => ({ adsShown: shown.size, adsClicked: clicked.size }),
    debugUrls: () => urls,  };
}

async function showAdsgramOnce(blockId) {
  const t = createAdsgramClickTracker();
  t.start();
  let result = null;
  try { result = await window.Adsgram.init({ blockId }).show(); }
  catch (e) { result = e; }
  finally { await new Promise(r => setTimeout(r, 500)); t.stop(); }
  console.log("[AdTracker] summary", t.summary());
  return { result, clicks: t.summary(), urls: t.debugUrls() };
}

const ADS_DEBUG = false; // set false when you're done testing

function showNoClickPopup({ shown = 0, clicked = 0, required = 1, attemptsLeft = 0, debugUrls = [] }) {
  return new Promise((resolve) => {
    try { tg.HapticFeedback.notificationOccurred('warning'); } catch {}

    const tile = (label, value, color) => `
      <div style="flex:1;padding:10px 4px;border-radius:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);text-align:center">
        <div style="font-size:18px;font-weight:900;color:${color}">${value}</div>
        <div style="font-size:8px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#64748b;margin-top:2px">${label}</div>
      </div>`;

    const el = document.createElement("div");
    el.style.cssText = "position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(4,2,14,0.88);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);animation:fadeIn 0.2s ease-out";
    el.innerHTML = `
      <div style="width:100%;max-width:320px;position:relative;padding:28px 24px 24px;border-radius:28px;background:rgba(20,18,60,0.97);border:1px solid rgba(245,158,11,0.25);box-shadow:0 0 40px rgba(245,158,11,0.1);animation:popupSlideUp 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards">
        <div style="width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:24px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25)">👆</div>
        <div style="font-size:13px;font-weight:900;color:#f8fafc;text-align:center;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Tap the ad to earn</div>
        <div style="font-size:11px;color:#94a3b8;text-align:center;line-height:1.6;margin-bottom:14px">
          ${clicked === 0 ? "You didn't tap any ad." : "You didn't tap enough ads."}
          Watch again and tap the ad button before it closes.
        </div>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          ${tile("Shown", shown, "#3b82f6")}
          ${tile("Tapped", clicked, clicked >= required ? "#10b981" : "#f59e0b")}
          ${tile("Needed", required, "#10b981")}
        </div>
        <div style="font-size:9px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#64748b;text-align:center;margin-bottom:16px">${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left</div>
        ${ADS_DEBUG ? `<pre style="text-align:left;font-size:8px;color:#64748b;white-space:pre-wrap;word-break:break-all;max-height:80px;overflow:auto;margin:0 0 14px">${debugUrls.length ? debugUrls.slice(-6).join("\n") : "no adsgram beacons seen"}</pre>` : ""}
        <button id="ncp-retry" class="popup-btn-primary" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#ffffff">Watch again</button>
        <button id="ncp-cancel" class="popup-btn-cancel">Cancel</button>
      </div>`;

    const done = (v) => { el.remove(); resolve(v); };
    el.querySelector("#ncp-retry").onclick = () => done("retry");
    el.querySelector("#ncp-cancel").onclick = () => done("cancel");
    document.body.appendChild(el);
  });
}
