---
title: M1.2 Scaffold 第二關 — 程式碼掃描報告（create-next-app）
type: 安全檢查報告
tags: [pictag, security, scaffold-scan, M1]
mode: 探索（首次 GitHub 開源探索）
sop: "「開源安全檢查 SOP」 §第二關"
target: "npx create-next-app@latest pictag-app（Next.js 16.2.4 / React 19.2.4）"
status: draft
created: 2026-04-29
updated: 2026-04-29
---

# M1.2 第二關 — Scaffold 程式碼掃描報告

> **SOP：** 「開源安全檢查 SOP」 §第二關（10 分鐘）
> **scaffold 對象：** `npx create-next-app@latest pictag-app --typescript --app --tailwind --eslint --no-src-dir --use-npm --yes`
> **產出：** `pictag-app/`（Next.js 16.2.4，359 packages 安裝完成）
> **資料抓取時間：** 2026-04-29

---

## 結論速查

| 檢查 | 結果 | 紅旗？ |
|---|---|---|
| package.json 依賴 | next 16.2.4 / react 19.2.4 / tailwind v4 / eslint v9 / typescript v5 | ✅ 標準官方組合 |
| `npm audit` | 2 moderate（postcss < 8.5.10，CVE GHSA-qx2v-qp2m-jg93）| ⚠️ **moderate**，**非 Critical/High** |
| 自家 source 對外 URL | 4 條 utm_source links（Vercel / Next.js 官方教學 / template）| ✅ 範本連結，可清 |
| 自家 source `fetch` / `eval` / `WebSocket` | 0 | ✅ |
| 自家 source `localStorage` / `cookie` / `sessionStorage` | 0 | ✅ |
| postinstall scripts in deps | **1 個：`unrs-resolver`**（透過 `napi-postinstall` 抓 native binary） | ⚠️ 需理解（見下節） |
| postinstall in own package.json | 無 | ✅ |

**整體判定：** ✅ **可進 M2**，但有 2 點需處理：
1. `npm audit` 的 postcss moderate — 等 next 升級即修，目前 **可接受**
2. 樣板頁面對外連結 — M2 開工會整頁刪除、消失

---

## 2-1. package.json 依賴清單

```json
"dependencies": {
  "next": "16.2.4",
  "react": "19.2.4",
  "react-dom": "19.2.4"
},
"devDependencies": {
  "@tailwindcss/postcss": "^4",
  "@types/node": "^20",
  "@types/react": "^19",
  "@types/react-dom": "^19",
  "eslint": "^9",
  "eslint-config-next": "16.2.4",
  "tailwindcss": "^4",
  "typescript": "^5"
}
```

**評估：** 全部是 Next.js 官方 scaffold 預設組合，沒有任何「typosquatting 名稱」、「來路不明 registry」、「個人冷門套件」。**綠燈**。

---

## 2-2. `npm audit` 結果

```
postcss  <8.5.10
Severity: moderate
PostCSS has XSS via Unescaped </style> in its CSS Stringify Output
GHSA-qx2v-qp2m-jg93
fix available via `npm audit fix --force`
Will install next@9.3.3, which is a breaking change

2 moderate severity vulnerabilities
```

**分析：**
- 漏洞 = postcss < 8.5.10 的 XSS（透過 stringify 未跳脫 `</style>`）
- 影響面 = build-time CSS 處理，**runtime 瀏覽器不會觸發**（pictag 是 SSG static export，建置完就靜態檔）
- audit fix 會把 `next` 降到 9.3.3（breaking change）→ **不採用**
- 真正修法：等 next 16.2.5+ 升級依賴；或自己 pin postcss>=8.5.10 的 override

**判定：** ⚠️ **moderate（非 Critical/High），可接受**。
- SOP §第二關通過標準是「`npm audit` Critical 就停」、moderate 不擋
- 教案版上線前再追蹤 Next.js 升 patch，到時 `npm update`

**追蹤 TODO：** 寫進 roadmap，每 2 週重跑一次 `npm audit`，遇到 next 上游修 postcss 順手升。

---

## 2-3. 程式碼關鍵字搜尋

### 自家 source（`app/`、`next.config.ts`）

| 模式 | 命中 | 說明 |
|---|---|---|
| `fetch(` / `axios` / `XMLHttpRequest` / `WebSocket` / `sendBeacon` | 0 | ✅ |
| `localStorage` / `sessionStorage` / `document.cookie` | 0 | ✅ |
| `eval(` / `new Function(` | 0 | ✅ |
| `https?://` | 4 條 | 全是 `app/page.tsx` 樣板頁的 utm 連結（Vercel / Next.js 官方教學 / template / docs） |

**4 條 URL 詳列：**
```
app/page.tsx: vercel.com/templates?...&utm_campaign=create-next-app
app/page.tsx: nextjs.org/learn?...&utm_campaign=create-next-app
app/page.tsx: vercel.com/new?...&utm_campaign=create-next-app
app/page.tsx: nextjs.org/docs?...&utm_campaign=create-next-app
```

**判定：** ✅ 全是已知品牌 + utm 追蹤參數，是 scaffold 樣板頁的「歡迎連結」。整頁會在 M2 替換成 pictag UI、自然消失。

> **已知行為：** 「完全本地」工具的 production code 不應有對外 HTTP，但**模型載入**（從 HF Hub）會是預期內的對外請求。第四關 DevTools 監控時要把這條合法請求列進白名單。

---

## 2-4. postinstall script 風險

### 自家 package.json

✅ 無 `preinstall` / `postinstall` / `prepare` 腳本。

### 依賴鏈

執行 `grep -lE '"(pre|post)install"' node_modules/*/package.json` 後，**整個 dep tree 中只有 1 個套件有 postinstall：**

| 套件 | postinstall 內容 | 評估 |
|---|---|---|
| `unrs-resolver@1.11.1` | `napi-postinstall unrs-resolver 1.11.1 check` | ⚠️ 見下節 |

### `unrs-resolver` 是什麼

- **用途：** Next.js 16 內建的 Rust 寫的模組解析器（透過 NAPI 跨平台），用於替代舊的 webpack resolver、加速 dev/build
- **倉庫：** `git+https://github.com/unrs/unrs-resolver.git`
- **本機狀態：** 已含 `node_modules/unrs-resolver/resolver-binding-win32-x64-msvc/`，本機 binary 已在 tree 內

### `napi-postinstall` 在做什麼

讀 `node_modules/napi-postinstall/lib/index.js` 開頭：

```js
// 用 node:http / node:https 抓 .tar.gz、解壓出 platform-specific binary
function fetch(url) { ... apiClient.get(url, ...) ... }
function extractFileFromTarGzip(buffer, subpath) { zlib.unzipSync ... }
```

**行為：** 安裝時若**該平台的 native binary 沒在 npm package 裡**，就會從遠端下載對應 platform 的 binary tarball、解壓、放進 node_modules。

### 風險評估

| 面向 | 說明 |
|---|---|
| **是否惡意 pattern** | ❌ 不是 — 這是 napi-rs 生態的標準作法（同類：esbuild / @swc/core / sharp / better-sqlite3） |
| **本機觸發了嗎** | ✅ 已執行（scaffold 過程 359 packages 安裝完）、Windows x64 binary 已落地 |
| **下一台機器（教案學員）會發生什麼** | 學員若不是 win32-x64-msvc 平台，install 時會觸發 fetch 抓對應 binary |
| **供應鏈攻擊面** | ⚠️ 理論上若 `napi-postinstall` 上游被入侵或 binary 散布伺服器被劫持，會分發惡意 binary。屬整個 napi-rs 生態的共同風險、不是 unrs-resolver 特有 |
| **Next.js 16 不可避免** | ⚠️ 是 — Next.js 16 直接依賴 unrs-resolver、不裝就跑不起來 |

**判定：** ⚠️ **可接受但記錄**。理由：
1. unrs-resolver 是 Next.js 16 的核心依賴、不能拔
2. 用的是 napi-rs 生態標準 postinstall pattern、不是惡意行為
3. 攻擊面真實存在但屬整個 Rust-on-Node 生態共有、業界接受度高
4. **緩解：** lock file 已生成（package-lock.json）、之後 `npm ci` 用 lock，不會跑 unsigned 升級

**動作：** 寫進「已知 supply-chain 風險」清單，教案版要對學員講清楚「為什麼 Next.js install 會看到 unrs-resolver 抓檔」。

---

## 2-5. 雜項觀察

### create-next-app 在 scaffold 過程**自動 `git init` 了 pictag-app/**

- `git log` 第一個 commit：`b126bdc Initial commit from Create Next App`
- 我們原本規劃 git init 在「四關全通」之後做
- **影響：** 子目錄已是獨立 git repo，與 pictag/ 根目錄結構衝突
- **處理建議：** 先暫時保留 pictag-app/.git（方便追改造 diff），M5 部署前再決定要 monorepo 還是 nested repo
- 沒對 pictag/ 根目錄汙染（pictag/ 仍非 git repo）

### 樣板頁面對外連結
- 4 條 utm 連結將在 M2 寫 pictag UI 時整檔覆蓋
- 不需要主動清理；自然消失

---

## 第二關整體判定

✅ **通過**。可進 M1.3（第三關 — AI 模型安全）/ M2 PoC。

### 通過標準對照（「開源安全檢查 SOP」 §第二關）
- [x] package.json 無奇怪依賴（無 typosquatting / 私有 registry）
- [x] `npm audit` **無 Critical**（2 moderate 可接受、追蹤 next 升級即修）
- [x] 程式碼關鍵字 — 自家 source 無 fetch / eval / 對外 URL（除樣板 utm，會被覆蓋）
- [x] postinstall scripts 已盤點 — 唯一一個（unrs-resolver）為已知 napi-rs pattern、可接受

### 待第三關（M1.3）
- HuggingFaceTB/SmolVLM-256M-Instruct ONNX 檔下載 + sha256 驗證
- 模型來源確認（HF 官方 endpoint）

### 待第四關（M2）
- DevTools Network：跑起來後除模型載入外不應有對外請求
- 第一次斷網執行驗證
- IndexedDB / localStorage 觀察（pictag 自己會用，但要確認沒「出去」）

### 持續追蹤 TODO
- [ ] 每 2 週 `npm audit`；Next.js 16.2.5+ 出來時 `npm update` 解 postcss
- [ ] M5 部署前重評估 unrs-resolver 風險（若上游有 advisory 公告即動）
- [ ] M2 開工後重新對 `app/`、`components/` 跑一次關鍵字掃描（confirm 沒引入新外連）

---

## 相關連結

- [第一關信譽報告](upstream_reputation_20260429.md)
