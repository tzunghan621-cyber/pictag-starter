# Case Studies — 真實開發案例

這個資料夾**不是給學員改的**,是給「想看一下 AI-assisted 開發實際長什麼樣」的人讀的。

三份案例,每份都是 PicTag 真實建構過程的縮影:

---

## 1. [`security-audit/`](security-audit/) — 開源依賴的四關安全檢查

**情境:** 要在瀏覽器跑開源 AI 模型,怎麼確定它不會偷上傳照片、不會偷裝後門?

**內容:**
- [`upstream_reputation_20260429.md`](security-audit/upstream_reputation_20260429.md) — 第一關:GitHub / HuggingFace 信譽快速判斷(2 分鐘)
- [`scaffold_scan_20260429.md`](security-audit/scaffold_scan_20260429.md) — 第二關:`package.json` + `npm audit` + 關鍵字搜尋
- [`model_safety_20260429.md`](security-audit/model_safety_20260429.md) — 第三關:模型來源、commit pin、`config.json` 靜態審查
- [`runtime_monitor_sop.md`](security-audit/runtime_monitor_sop.md) — 第四關 SOP:DevTools Network + 斷網驗證的步驟
- [`pictag-monitor.console.js`](security-audit/pictag-monitor.console.js) — 第四關用的監控腳本(貼進 Console 就跑)
- [`runtime_monitor_20260513.md`](security-audit/runtime_monitor_20260513.md) — 第四關實跑報告(含發現的紅旗)

**學到什麼:**
- 怎麼把「資料邊界」從口頭聲明變成可驗證的事實
- AI 怎麼幫你跑這些檢查(不是自己一檔一檔看)
- 紅旗會長什麼樣

---

## 2. [`debug-caption-bug.md`](debug-caption-bug.md) — Caption 亂碼從發現到修好

**情境:** PoC 跑起來了,但模型輸出 `)) )) )) ))` 亂碼。Demo 給人看 30 秒,要怎麼半天內把它修好?

**內容:**
- 4 種 dtype 配置都試過、各自不同退化模式
- 怎麼下「不是單純量化問題」這個判斷
- 派 subagent 做 web research、找到 HF 官方 working code 的差異
- 三項改動同時下:`AutoModelForVision2Seq` + `dtype: "fp32"` + `repetition_penalty: 1.1`
- before / after 對照、代價分析

**學到什麼:**
- 「vibe debugging」是怎樣的流程:看症狀 → 提假設 → 用最少代價驗證 → 排除
- 什麼時候該派 subagent(這裡是 web research)而不是自己挖
- 寫 devlog 給未來的自己 + 未來的學員

---

## 3. [`research-reports/`](research-reports/) — Subagent 研究報告範例

**情境:** 卡在一個技術問題,自己挖 6 個 GitHub issue 太花時間。怎麼派出去?

**內容:**
- [`smolvlm_256m_caption_garbage_20260513.md`](research-reports/smolvlm_256m_caption_garbage_20260513.md) — subagent 為 caption bug 跑的研究報告(對應 case 2 的研究步驟)

**學到什麼:**
- 給 subagent 的 prompt 要怎麼寫(背景、症狀、要查的問題、輸出格式)
- 「Q1/Q2/Q3/Q4 結構」對研究報告的好處
- 怎麼判斷 subagent 找到的東西可不可信