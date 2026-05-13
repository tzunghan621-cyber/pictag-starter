// pictag-monitor.console.js
// 用法：DevTools → Console → 整段貼上 → Enter
// 安裝後它會 patch window.fetch / XMLHttpRequest 並記錄所有對外請求。
// 配合「階段標記」可以把 log 切成 load / inference / offline-reload 三段。
// 用 __pictagMon.copy() 把整份 log 複製到剪貼簿。
(() => {
  if (window.__pictagMon) {
    console.warn("[pictag monitor] already installed; skipping");
    return;
  }

  const entries = [];
  let phase = "init";

  const push = (kind, url, extra = {}) => {
    const e = {
      t: Date.now(),
      iso: new Date().toISOString(),
      phase,
      kind,
      url: String(url),
      ...extra,
    };
    entries.push(e);
    // 只 console.log 對外請求（過濾 localhost 雜訊）
    let host = "(invalid)";
    try { host = new URL(url, location.href).host; } catch {}
    const isLocal =
      host === location.host || host.startsWith("localhost") || host.startsWith("127.");
    if (!isLocal) {
      console.log(`%c[NET] ${phase} ${kind} ${host}`, "color:#888", url);
    }
  };

  // ---- patch fetch ----
  const origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url =
      typeof input === "string"
        ? input
        : input && input.url
        ? input.url
        : String(input);
    const method = (init && init.method) || (input && input.method) || "GET";
    push("fetch", url, { method });
    return origFetch(input, init);
  };

  // ---- patch XHR ----
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    push("xhr", url, { method });
    return origOpen.call(this, method, url, ...rest);
  };

  // ---- API ----
  window.__pictagMon = {
    setPhase(p) {
      phase = String(p);
      console.log(
        `%c[pictag monitor] phase = ${phase}`,
        "color:#0a0;font-weight:bold"
      );
    },
    get entries() { return entries; },
    domains() {
      const set = new Set();
      for (const e of entries) {
        try { set.add(new URL(e.url, location.href).host); } catch {}
      }
      return [...set].sort();
    },
    externalDomains() {
      const here = location.host;
      return this.domains().filter(
        (h) => h !== here && !h.startsWith("localhost") && !h.startsWith("127.")
      );
    },
    byPhase() {
      const m = {};
      for (const e of entries) {
        (m[e.phase] ||= []).push(e);
      }
      return m;
    },
    summary() {
      const m = this.byPhase();
      const out = {};
      for (const [p, list] of Object.entries(m)) {
        const set = new Set();
        for (const e of list) {
          try { set.add(new URL(e.url, location.href).host); } catch {}
        }
        const here = location.host;
        out[p] = {
          totalRequests: list.length,
          externalDomains: [...set].filter(
            (h) => h !== here && !h.startsWith("localhost") && !h.startsWith("127.")
          ).sort(),
        };
      }
      return out;
    },
    export() {
      return JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          userAgent: navigator.userAgent,
          webgpu: !!navigator.gpu,
          pageUrl: location.href,
          phasesSeen: [...new Set(entries.map((e) => e.phase))],
          uniqueDomains: this.domains(),
          externalDomains: this.externalDomains(),
          summaryByPhase: this.summary(),
          entries,
        },
        null,
        2
      );
    },
    copy() {
      // `copy` 是 Chrome/Edge DevTools Console 內建 helper
      // eslint-disable-next-line no-undef
      copy(this.export());
      console.log(
        `%c[pictag monitor] exported ${entries.length} entries to clipboard`,
        "color:#0a0;font-weight:bold"
      );
    },
    table() {
      console.table(
        entries.map((e) => ({
          phase: e.phase,
          kind: e.kind,
          method: e.method,
          host: (() => { try { return new URL(e.url, location.href).host; } catch { return "?"; } })(),
          url: e.url,
        }))
      );
    },
  };

  console.log(
    "%c[pictag monitor] installed",
    "color:#0a0;font-weight:bold;font-size:13px"
  );
  console.log(
    "用法:\n" +
      '  __pictagMon.setPhase("load")           // 開始載模型前\n' +
      '  __pictagMon.setPhase("inference")      // 開始 Generate 前\n' +
      '  __pictagMon.setPhase("offline-reload") // 斷網重整前\n' +
      "  __pictagMon.table()                    // 即時看表\n" +
      "  __pictagMon.summary()                  // 按階段彙總 host\n" +
      "  __pictagMon.copy()                     // 完整 JSON 複製到剪貼簿"
  );
})();
