function createAdsgramClickTracker() {
  const shown = new Set(), clicked = new Set();
  let oFetch, oOpen, oSend, oBeacon, active = false;

  const record = (url) => {
    if (!url || !String(url).includes("api.adsgram.ai/event")) return;
    const id = (String(url).match(/[?&]record=([^&]+)/) || [])[1] || url;
    if (url.includes("type=Show"))  shown.add(id);
    if (url.includes("type=Click")) clicked.add(id);
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
  };
}

async function showAdsgramOnce(blockId) {
  const t = createAdsgramClickTracker();
  t.start();
  let result = null;
  try { result = await window.Adsgram.init({ blockId }).show(); }
  catch (e) { result = e; }
  finally { await new Promise(r => setTimeout(r, 500)); t.stop(); }
  return { result, clicks: t.summary() };
}

function showNoClickPopup({ clicked = 0, required = 1, attemptsLeft = 0 }) {
  return new Promise((resolve) => {
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75);padding:20px";
    el.innerHTML = `
      <div style="max-width:320px;width:100%;background:#0b0f1a;border:1px solid #00e5ff;border-radius:16px;padding:22px;text-align:center;color:#fff;box-shadow:0 0 24px rgba(0,229,255,.35)">
        <div style="font-size:38px">👆</div>
        <h3 style="margin:8px 0;color:#00e5ff">Click the ad to earn</h3>
        <p style="font-size:14px;opacity:.85;margin:0 0 6px">
          ${clicked === 0 ? "You didn't click the ad." : `You clicked ${clicked} of ${required} required.`}
          Watch again and tap the ad button before it closes.
        </p>
        <p style="font-size:12px;opacity:.6;margin:0 0 16px">${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left</p>
        <button id="ncp-retry" style="width:100%;padding:12px;border:0;border-radius:10px;background:#00e5ff;color:#000;font-weight:700">Watch again</button>
        <button id="ncp-cancel" style="width:100%;padding:10px;margin-top:8px;border:0;background:none;color:#fff;opacity:.6">Cancel</button>
      </div>`;
    const done = (v) => { el.remove(); resolve(v); };
    el.querySelector("#ncp-retry").onclick = () => done("retry");
    el.querySelector("#ncp-cancel").onclick = () => done("cancel");
    document.body.appendChild(el);
  });
}
