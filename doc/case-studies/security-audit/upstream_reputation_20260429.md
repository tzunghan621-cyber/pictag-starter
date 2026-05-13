---
title: M1.1 候選 upstream — 第一關信譽判斷報告
type: 安全檢查報告
tags: [pictag, security, upstream-evaluation, M1]
mode: 探索（首次 GitHub 開源探索）
sop: "「開源安全檢查 SOP」 §第一關"
status: draft
created: 2026-04-29
updated: 2026-04-29
---

# M1.1 候選 upstream — 第一關信譽判斷報告

> **SOP：** 「開源安全檢查 SOP」 §第一關（GitHub 頁面瀏覽，2 分鐘）
> **本報告只涵蓋第一關**；第二關（程式碼掃描）/ 第三關（模型）/ 第四關（執行時）尚未跑。
> **資料抓取時間：** 2026-04-29（透過 WebFetch 抓 GitHub / HuggingFace 公開頁面）

---

## 結論速查

| 候選 | 信譽 | 建議 |
|---|---|---|
| **Next.js**（`vercel/next.js`） | ✅ 綠燈 | **推薦起手** — 教案最好控、起點乾淨 |
| **Transformers.js**（`huggingface/transformers.js`） | ✅ 綠燈 | **必裝** — 推論主庫、無替代 |
| **Transformers.js Examples**（`huggingface/transformers.js-examples`） | ✅ 綠燈 | **參考用** — 不直接 fork、抓 SmolVLM / Next.js 範例對照 |
| **SmolVLM-256M-Instruct**（HF 模型） | ✅ 綠燈 | **採用** — 官方 HF、ONNX + WebGPU 齊全 |

**綜合建議：** 全部第一關通過，可進第二關（`npm audit` + 關鍵字掃描）。

---

## 候選 1：vercel/next.js

| 檢查項 | 結果 | 紅旗？ |
|---|---|---|
| Stars | 139k | ✅（>>1K） |
| 最後更新 | 2026-04-15（v16.2.4 release） | ✅ 活躍 |
| Contributors | 抓取失敗（GitHub 頁面 lazy load） | ⚠️ 待 `git shortlog` 補 |
| Open Issues | 2.1k | ⚠️ 量大，但活躍專案常態，**非紅旗** |
| License | **MIT** | ✅ 教案友善 |
| 組織背書 | **Vercel** | ✅ 知名組織 |
| README 品質 | 完整、含 quick start / docs / 安全揭露流程 / good-first-issues | ✅ |

**判定：** ✅ 綠燈。
**用途：** 用 `npx create-next-app@latest` 起手 — 不直接 fork repo，是用官方 scaffold 工具產出乾淨 Next.js 專案。

---

## 候選 2：huggingface/transformers.js

| 檢查項 | 結果 | 紅旗？ |
|---|---|---|
| Stars | 15.9k | ✅（>>1K） |
| Forks | 1.1k | ✅ |
| 最後更新 | 頁面未直接顯示 commits 1991 筆，需另查 | ⚠️ 第二關 clone 後 `git log -1` 確認 |
| Contributors | 同上 | ⚠️ |
| Open Issues | 172 | ✅ 健康 |
| Open PR | 60 | ✅ |
| License | **Apache-2.0** | ✅ 教案友善 |
| 組織背書 | **Hugging Face** | ✅ 知名組織 |
| README 品質 | 完整、Python/JS 對照 quick start、WebGPU 章節、量化選項、模型支援表 | ✅ |

**判定：** ✅ 綠燈。
**用途：** 透過 npm 裝（`npm install @huggingface/transformers`），不 clone 原始 repo。npm 套件本身的安全在第二關用 `npm audit` 驗。

---

## 候選 3：huggingface/transformers.js-examples

| 檢查項 | 結果 | 紅旗？ |
|---|---|---|
| Stars | 2,000 | ✅（>1K） |
| 最後更新 | 頁面未顯示 | ⚠️ 第二關補查 |
| Contributors | 抓取失敗 | ⚠️ |
| Open Issues | 16 | ✅ 低 |
| License | **Apache-2.0** | ✅ |
| 組織背書 | **Hugging Face** | ✅ |
| README 品質 | 簡潔 — 範例集合表 + demo 連結 | ✅（範例庫合理） |
| 範例語言組成 | JS 64.8% / TS 25.6% / CSS 5.6% / HTML 3.3% | ✅ |

**包含範例（與 pictag 強相關）：**
- ✅ **Next.js**（直接對應我們起手框架）
- ✅ **SmolLM WebGPU**（SmolVLM 的姊妹模型範例，可參考載入方式）
- ✅ Phi-3.5 WebGPU / Llama-3.2 WebGPU（多模態 / 大模型 WebGPU 範例可借鏡）
- ✅ Segment Anything WebGPU / Remove Background WebGPU（視覺類 WebGPU 範例）

**判定：** ✅ 綠燈。
**用途：** **參考、非 fork**。pictag 不直接以此為起點，避免繼承 example repo 的 monorepo 結構與額外依賴。改造方式：抓 `Next.js` 範例 + `SmolLM WebGPU` 範例的 code 片段對照學習，自己的 repo 從 `create-next-app` 起手後手動接上。

---

## 候選 4：HuggingFaceTB/SmolVLM-256M-Instruct（HF Hub 模型）

| 檢查項 | 結果 | 紅旗？ |
|---|---|---|
| 上傳者 | **HuggingFaceTB**（HF 官方研究組） | ✅ 高信任 |
| 最後更新 | 2025-03-02（collection）/ arxiv 2025-04-07 | ✅ 一年內 |
| 下載量（過去 30 天） | 615,462 | ✅ 大規模採用、被檢視過 |
| License | **Apache-2.0** | ✅ |
| Model card 品質 | 完整：技術摘要 / 範例 / 訓練細節 / benchmark / 引用 | ✅ |
| ONNX 格式 | ✅ 提供完整 ONNX weights | ✅ 可用於 transformers.js |
| WebGPU 支援 | ✅（43+ spaces 使用） | ✅ |
| Safetensors（BF16） | ✅ | ✅ |
| 安全聲明 | Model card 明示**禁用情境**（招聘 / 教育 / 信用評分 / 監控等高風險決策） | ✅ 透明 |
| 已知限制 | 不適合事實性內容生成、不能高風險決策 | ✅ 標示清楚 |

**規格速查：**
- 256M 參數（0.3B）/ Vision encoder 93M（SigLIP）/ Text decoder SmolLM2-135M
- 64 visual tokens per 512×512 patch
- < 1GB GPU RAM 推論

**判定：** ✅ 綠燈。
**用途：** pictag 主要推論模型。第三關（模型完整性）必跑：載入 ONNX 後對 sha256，model card 上的 hash 應該對得上；第四關 DevTools 驗證載入時除了模型檔本身、不應有別的對外請求。

---

## 第一關整體判定

**全部 4 個候選通過第一關。** 可進第二關。

### 待第二關 / 第三關補做

| 缺口 | 來源 | 何時補 |
|---|---|---|
| Next.js / transformers.js / examples 的最後 commit 日期、contributors 人數 | WebFetch 抓不到（lazy load） | 進入 M1.2 第二關時 `git log -1` / `git shortlog -sn` |
| `npm audit` 結果 | 還沒 install | M1.2 第二關 |
| postinstall script 檢查 | 還沒 install | M1.2 第二關 |
| 程式碼關鍵字掃描（fetch / eval / 對外 URL / localStorage） | 還沒 clone | M1.2 第二關 |
| SmolVLM ONNX 檔 sha256 對齊 | 還沒下載 | M1.3 第三關 |
| DevTools Network 觀察執行時請求 | 還沒跑起來 | M2 第四關 |
| 第一次斷網執行驗證 | 還沒跑起來 | M2 第四關 |

---

## M1.1 推薦選型（給甲方拍板）

```
起手：npx create-next-app@latest pictag-app --typescript --app --tailwind
        → 之後手動 npm install @huggingface/transformers
        → 從 transformers.js-examples 抓 Next.js + SmolLM WebGPU 範例對照接入

模型：HuggingFaceTB/SmolVLM-256M-Instruct（ONNX，HF Hub 動態載入）
```

**為何不直接 fork transformers.js-examples 的 Next.js 子目錄：**
- 範例是 monorepo / 多 example 共存，繼承會帶進非必要的 build 設定
- 教案場景要「從 0 到上線」清楚展示，乾淨 scaffold 起手最好教
- 安全面：fork 範例 repo 等於繼承 40+ 範例的所有依賴 surface area，不必要

**請甲方拍板：** 用上面這個方案進 M1.2，還是要換 upstream？

---

## 相關連結

- [專案速查](../../manuals/project_overview.md)
