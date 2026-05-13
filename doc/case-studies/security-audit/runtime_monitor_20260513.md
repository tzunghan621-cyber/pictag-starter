---
title: M1.2/M2 第四關 — runtime monitor 報告
type: 安全檢查報告
tags: [pictag, security, runtime-monitor, M2, M1]
sop: "「開源安全檢查 SOP」 §第四關"
status: pass-with-notes
created: 2026-05-13
updated: 2026-05-13
---

# M1.2 / M2 第四關 — runtime monitor 報告

> **SOP：** 「開源安全檢查 SOP」 §第四關（執行時監控）+ [runtime_monitor_sop.md](./runtime_monitor_sop.md)
> **執行環境：** Playwright headed Chromium 147.0.0.0(取代手動 Chrome；WebGPU 可用)
> **執行者：** AI(Claude)透過 Playwright MCP 自動操作 + 監控腳本注入
> **資料：**
> - `_runtime_log_online_20260513.json`(連網 load + inference)
> - `_runtime_log_offline_20260513.json`(斷網 reload + cache hit + inference)

---

## 結論速查

| 關鍵驗證 | 結果 |
|---|---|
| 載模型期間對外網域只在預期白名單 | ✅ huggingface.co + cdn.jsdelivr.net,**無預期外網域** |
| 推論期間 0 對外請求(online) | ✅ 0 entries |
| 推論期間 0 對外請求(offline) | ✅ 0 entries |
| 斷網重整後模型可從 cache 載入 | ✅ 成功就緒,推論完成 |
| 斷網推論能跑(離線可用性) | ✅ 30.22s 完成、無 console error |
| Revision pin 對所有檔案有效 | ⚠️ **大致有效但有例外** — 詳見 §風險與備註 |
| 描述輸出品質(非安全項目) | ❌ 亂碼,但**屬功能性 bug,非安全**;留待後續處理 |

**整體判定:第四關 PASS(with notes)。** 安全邊界(不上傳照片、可離線、無預期外網域)成立;有 2 件待釐清(revision pin 例外 + caption 亂碼),其中 caption 不影響本關放行。

---

## 環境

| 項目 | 值 |
|---|---|
| 執行日期 | 2026-05-13(UTC+8) |
| 瀏覽器 | Chromium 147.0.0.0(Playwright headed) |
| WebGPU | ✅ `navigator.gpu` available |
| dev server | Next.js 16.2.4 Turbopack @ localhost:3000 |
| 監控方式 | `window.fetch` + `XMLHttpRequest.prototype.open` 雙 patch,分階段 tagging |
| 斷網方式 | `context.route('**/*', ...)` 攔截外部 host,放行 localhost(模擬「關 Wi-Fi 但 dev server 還在」) |

> **與真實 Chrome 的差異:** Playwright Chromium 與用戶日後實際使用的 Chrome 同核心,網路行為一致;唯獨 IndexedDB 是 Playwright session 範圍(關 session 就清),不能用此關證明「使用者下次開仍命中」— 該驗證需手動在 Chrome 補一次。

---

## Phase 1:連網載入模型

```
phase: "load" — 19 entries — 2 external domains
```

### 對外網域

| 網域 | 請求數 | 用途 | 預期? |
|---|---|---|---|
| `huggingface.co` | 17 | 模型 metadata + ONNX 檔 | ✅ 第三關白名單 |
| `cdn.jsdelivr.net` | 2 | ORT WASM(`onnxruntime-web@1.26.0-dev...`) | ⚠️ 預期外但**已在 M2 devlog 預警** |

### Hugging Face 抓的檔案(全列)

| URL pattern | revision |
|---|---|
| `/resolve/7e3e67e.../config.json` | ✅ pin |
| `/resolve/7e3e67e.../generation_config.json` | ✅ pin |
| `/resolve/7e3e67e.../preprocessor_config.json` | ✅ pin |
| `/resolve/7e3e67e.../processor_config.json` | ✅ pin |
| `/resolve/7e3e67e.../tokenizer.json` | ✅ pin |
| `/resolve/7e3e67e.../tokenizer_config.json` | ✅ pin |
| `/resolve/**main**/tokenizer_config.json` | ⚠️ **未 pin** — duplicate fetch,使用 branch ref |
| `/resolve/7e3e67e.../onnx/decoder_model_merged_q4f16.onnx` | ✅ pin |
| `/resolve/7e3e67e.../onnx/embed_tokens_q4f16.onnx` | ✅ pin |
| `/resolve/7e3e67e.../onnx/vision_encoder_q4f16.onnx` | ✅ pin |

### jsdelivr 抓的檔案

| URL |
|---|
| `https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0-dev.20260416-b7804b056c/dist/ort-wasm-simd-threaded.asyncify.mjs` |
| `https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0-dev.20260416-b7804b056c/dist/ort-wasm-simd-threaded.asyncify.wasm` |

> `onnxruntime-web` 雖然走 jsdelivr CDN,但版本字串 + 套件名與 `@huggingface/transformers` 依賴一致,屬正常 ORT WASM bootstrap。

---

## Phase 2:連網推論

```
phase: "inference" — 0 entries
```

✅ **推論期間零對外請求**。推論時間 11.93 秒(Playwright headed,首次 WebGPU 編譯較慢)。

> 注意:`summary` 中無 `inference` 鍵 = 該階段 0 entries,完全靜默。

---

## Phase 3:斷網重整 + cache hit + 推論

```
phase: "offline-reload" — 1 entry(被攔截)
```

### 觀察

1. **頁面從 localhost 重新載入成功**(dev server 仍可達)
2. **「載入模型」按下後秒回 ready** — 表示模型主體(ONNX + tokenizer + configs)走 IndexedDB cache
3. **僅產生 1 個對外請求**,被網路攔截器擋下:
   ```
   GET https://huggingface.co/HuggingFaceTB/SmolVLM-256M-Instruct/resolve/main/tokenizer_config.json
   ```
   即連網階段那筆**未 pin** 的 duplicate fetch。被 abort 後 transformers.js 自動 fallback 到 cache,不影響推論
4. **斷網推論完成**(30.22 秒,WebGPU shader 也要重編譯),無 console error
5. Caption 輸出與連網時一致(都是亂碼,證明此 bug 與網路無關)

✅ **安全邊界成立:**
- 推論期間 0 對外請求
- 斷網仍可推論 → 「本地運作」承諾成立
- 沒有「使用者圖片」上傳痕跡

---

## 風險與備註

### ⚠️ Note 1:`tokenizer_config.json` 重複 fetch、其中一筆未走 revision pin

**現象:** 連網載入時,`tokenizer_config.json` 被請求**兩次**:
- `/resolve/7e3e67edbbed.../tokenizer_config.json` ✅
- `/resolve/main/tokenizer_config.json` ⚠️

**風險面:**
- 若 upstream(HF)推送惡意更新到 `main` branch,而我們的 cache 已過期,`/main/` 那筆會抓到新版 — **revision pin 並非絕對防護**
- 在離線情境下,因 cache 命中、雖然 `/main/` 那筆失敗也不影響功能,但連網下會默默拿 `main` 版

**判斷:** 屬 transformers.js v4.2.0 內部行為(雙路徑探測 tokenizer config),非我方 code 控制。

**建議跟進:**
1. M5 部署前確認 transformers.js 更新版是否仍有此行為
2. 若教案 / 對外 demo 要強化,考慮自家代理或 IndexedDB pre-seed,完全切斷 `/main/` 路徑
3. 短期記在 `model_safety_20260429.md` 補充節 + 此處

### ⚠️ Note 2:Caption 輸出亂碼(非安全,功能性)

**現象:** 連網與斷網兩次推論輸出皆為 `)) )) )) )) )) . . .` 樣式的亂碼,推論本身完成(無 exception)。

**可能原因:**
- 合成測試圖過於簡單(256×256 純藍 + 黃圓 + 綠地)→ vision encoder 無有意義 token → decoder 輸出退化
- `apply_chat_template` 在 v4.2.0 對 Idefics3 系列的處理 bug
- `stripPrompt` 抓不到 `Assistant:` 標記,留下 chat template 殘骸

**安全影響:** 無 — 與網路、權限、上傳行為均無關。

**建議跟進:** 開 M3 前先驗一張真實照片(攝影圖)排除合成圖因素;若仍亂碼則進 `app/page.tsx` debug。

### ⚠️ Note 3:Playwright session 範圍的 IndexedDB

本關用 Playwright headed 跑,IndexedDB 在該 BrowserContext lifecycle 內,**關閉就沒**。「使用者日後第二次開瀏覽器仍走 cache」未直接驗證。

**建議跟進:** 此關通過後,甲方花 3 分鐘在自己 Chrome 跑一遍,確認:
1. 第一次跑下載 ~189 MB
2. 關 tab、重開 → DevTools → Application → IndexedDB → 看到 transformers-cache 之類 DB
3. 斷網(DevTools → Offline)再跑一次,確認秒回

### ✅ 未發現的紅旗(全部都沒踩到)

| SOP 紅旗 | 觀察結果 |
|---|---|
| 非 HF / 非 jsdelivr / 非 localhost 的對外網域 | ❌ 沒有 |
| 推論期間出現對外請求 | ❌ 沒有(online + offline 皆 0) |
| 斷網後 Generate 失敗 | ❌ 沒有(成功完成) |
| 描述空字串 / 完全死掉 | ❌ 推論成功(亂碼是 decoder 退化,有輸出) |
| IndexedDB 出現使用者圖片 record | ❌ 未發現(`ObjectURL` 為 in-memory,不持久化) |

---

## 對 roadmap 的影響

- ✅ M1.2 第四關 **PASS(with notes)** — 可打勾
- ✅ M2 第四關 **PASS(with notes)** — 可打勾
- ▶️ 下一步:M1.3 `git init` + 第一次 commit(把本報告與 `_runtime_log_*.json` 一起納入安全基線)
- ▶️ 後續:M3 進場前處理 caption 亂碼(Note 2)
- 📝 部署期(M5)前回頭驗 Note 1 是否仍存在 + 處理 jsdelivr 是否自家化

---

## 後續延後項

延後到第二輪(M2 不擋進度):

- ONNX 三檔 sha256 baseline → `model_hashes_baseline.md`(IndexedDB 抽 binary 較麻煩,留待手動操作)
- 在使用者真實 Chrome 跑一輪 IndexedDB 持久化確認(Note 3)
- `cdn.jsdelivr.net` 改 `public/ort/` 自家化(部署前決定)

---

## 相關連結

- [操作 SOP](./runtime_monitor_sop.md)
- [監控腳本](./pictag-monitor.console.js)
- [online log](./_runtime_log_online_20260513.json)
- [offline log](./_runtime_log_offline_20260513.json)
- [第一關 信譽](./upstream_reputation_20260429.md)
- [第二關 scaffold scan](./scaffold_scan_20260429.md)
- [第三關 模型安全](./model_safety_20260429.md)
- [Caption 除錯案例](../debug-caption-bug.md)
