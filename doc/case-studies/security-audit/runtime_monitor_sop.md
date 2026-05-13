---
title: M1.2/M2 第四關 — runtime monitor 操作 SOP
type: 操作 SOP
tags: [pictag, security, runtime-monitor, M2, sop]
sop: "「開源安全檢查 SOP」 §第四關"
status: active
created: 2026-05-07
updated: 2026-05-07
---

# 第四關 runtime monitor 操作 SOP

> **目的：** 把瀏覽器端的網路行為從口頭聲明變成可驗證的事實。
> **產出：** `doc/security/runtime_monitor_{YYYYMMDD}.md`(AI 寫)+ 兩份 JSON log(USER 匯出)。
> **預計時間：** 核心三項 15–20 分鐘。

---

## 角色分工

| 標記 | 誰做 | 範圍 |
|---|---|---|
| **[USER]** | 甲方手動操作 | 啟 dev server、點按鈕、切網路、複製 log、貼檔 |
| **[AI]** | Claude Code | 讀 log、判讀預期外網域、寫 `runtime_monitor_*.md` 報告 |

> 任何「瀏覽器互動」一律 USER；任何「文字判讀 + 寫報告」一律 AI。中間以 JSON log 為交接介面。

---

## 環境前置

- **瀏覽器：** Chrome / Edge 113+(WebGPU 必要)
- **DevTools tabs：** Network(`Disable cache` + `Preserve log` 都勾)、Console、Application
- **腳本：** [`pictag-monitor.console.js`](./pictag-monitor.console.js)

---

## 流程

### 步驟 0 — 啟動 dev server [USER]

```powershell
cd c:\AntiGravityDev\P_AI_DEV\pictag\pictag-app
npm run dev
```

等到看到 `http://localhost:3000`,在瀏覽器開。

### 步驟 1 — 安裝 monitor [USER]

1. F12 開 DevTools
2. **Network tab：** `Disable cache` 勾 + `Preserve log` 勾
3. **Console tab：** 把 [`pictag-monitor.console.js`](./pictag-monitor.console.js) 整份貼上、Enter
4. 看到綠字 `[pictag monitor] installed` = OK

### 步驟 2 — 載模型階段 [USER]

```js
__pictagMon.setPhase("load")
```

按頁面上的「載入模型」按鈕,等到 `✓ 模型就緒`(首次約 1–2 分鐘下載 + WebGPU compile)。

### 步驟 3 — 推論階段 [USER]

```js
__pictagMon.setPhase("inference")
```

選一張任意圖、按 `Generate Caption`,等描述出現。

> **觀察點(自己看一眼就好,不用回報):** 推論期間 Network 應該沒有新對外請求,只有本機 HMR/favicon 之類 localhost noise。

### 步驟 4 — 匯出 online log [USER]

```js
__pictagMon.summary()   // 先肉眼看一下各階段 external domains
__pictagMon.copy()      // 完整 JSON 進剪貼簿
```

把剪貼簿內容存成:

```
c:\AntiGravityDev\P_AI_DEV\pictag\doc\security\_runtime_log_online_20260507.json
```

(底線開頭代表「原始 log,給 AI 讀的中間檔」,正式報告 AI 會另寫。)

### 步驟 5 — 斷網驗證 [USER]

1. Console:
   ```js
   __pictagMon.setPhase("offline-reload")
   ```
2. **斷網**(任一種):
   - 拔網線 / 關 Wi-Fi
   - 或 DevTools → Network → 把 `No throttling` 改成 `Offline`(較精準、只擋瀏覽器分頁)
3. `F5` 重新整理頁面(會從 localhost dev server 拿 HTML,所以 dev server 不能停)
4. 按「載入模型」— 應該秒過(IndexedDB 命中)
5. 選圖 → `Generate Caption` — 應該成功、描述大致與步驟 3 類似
6. 匯出:
   ```js
   __pictagMon.copy()
   ```
   存成:
   ```
   c:\AntiGravityDev\P_AI_DEV\pictag\doc\security\_runtime_log_offline_20260507.json
   ```

### 步驟 6 — IndexedDB 觀察(輕量,可略) [USER]

DevTools → Application → IndexedDB:

- 看是否有 `transformers-cache`(或類似名稱)
- 看大小是否約 = 三個 ONNX 檔加總(預期 ~189 MB)
- **截圖**(可選),存 `doc/security/idb_20260507.png`

### 步驟 7 — 恢復網路、回報 [USER]

```js
__pictagMon.setPhase("done")
```

打開連網,回到對話跟我說:

- 「兩份 log 存好了」(路徑我已知)
- 斷網時推論**成功 / 失敗**?
- 斷網時描述輸出大致**和連網時類似 / 完全亂掉**?
- IDB 大小大概多少?(若有看)
- 過程中有沒有看到任何**意料外的紅字 / 失敗 / 怪網域**?

### 步驟 8 — AI 寫報告 [AI]

我會:

1. 讀兩份 `_runtime_log_*_20260507.json`
2. 比對 `externalDomains`,確認是否只在預期白名單內(`huggingface.co` / `cdn-lfs.huggingface.co` / 可能 `cdn.jsdelivr.net` / localhost)
3. 確認 `inference` 階段 external requests = 0
4. 確認 `offline-reload` 階段 external requests = 0
5. 產出 [`doc/security/runtime_monitor_20260507.md`](./runtime_monitor_20260507.md)(含通過 / 紅旗 / 後續建議)
6. 若無紅旗,roadmap M1.2 第四關 + M2 第四關打勾,進到 M1.3 `git init` 收尾

---

## 紅旗對照表(USER 看到時請停下來)

| 現象 | 含意 | 處理 |
|---|---|---|
| 載模型期間出現非 HF / 非 jsdelivr / 非 localhost 的對外網域 | 第三方下載點,可能是惡意 / 也可能只是 telemetry | 暫停,把該網域告訴我 |
| 推論期間出現任何對外請求 | 可能 phone-home(模型推論不該需要網路) | 暫停,看 Network 該請求的內容 |
| 斷網後 `Generate` 失敗 | cache 沒寫入 / dynamic import 沒 fallback | 暫停,把 console error 截圖 |
| 描述完全亂掉(亂碼 / 空字串) | 模型 cache 損毀 / 量化檔不對 | 暫停,看 console 有沒有警告 |
| IndexedDB 裡看到「使用者圖片」字樣的 record | 違反「照片不持久化」邊界 | 暫停,把 record key 告訴我 |

無紅旗 → 安心做完、回報。

---

## 可延後到第二輪的項目(現在不做也行)

- ONNX 三檔 sha256 baseline(對抗「日後模型被換掉」的長期 baseline,等模型確定不換再做即可) → 預定產出 `doc/security/model_hashes_baseline.md`
- 完整 IndexedDB schema 記錄
- `cdn.jsdelivr.net` 拉進 `public/ort/` 自家化 → 部署前(M5)再決定

---

## 相關連結

- [monitor script](./pictag-monitor.console.js)
- [Caption 除錯案例](../debug-caption-bug.md)
- [第三關模型安全](./model_safety_20260429.md)
