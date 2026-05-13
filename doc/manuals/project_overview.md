---
title: PicTag 技術組合速查
type: 速查
tags: [pictag, overview, technical]
status: active
---

# PicTag 技術組合速查

> 對外簡介在根目錄 `README.md`。本檔記實際技術細節,供想深入了解或要改造的人查。

---

## 技術組合

| 項目 | 實際 | 備註 |
|---|---|---|
| 起手方式 | `npx create-next-app pictag-app` | 不 fork upstream、最乾淨控制 |
| 框架 | Next.js 16(`output: "export"`、App Router、TypeScript) | 純靜態、無 SSR;`images.unoptimized: true` |
| AI 推論 | `@huggingface/transformers` v4.2.0 | `AutoProcessor` + `AutoModelForVision2Seq` |
| 模型 | `HuggingFaceTB/SmolVLM-256M-Instruct` | revision pin `7e3e67edbbed1bf9888184d9df282b700a323964` |
| dtype / device | **fp32** / WebGPU | 詳見「為何用 fp32」 |
| 推論參數 | `do_sample: false`、`repetition_penalty: 1.1`、`max_new_tokens: 256` | 對應 HF 官方 `smolvlm-webgpu` 範例 |
| 部署目標 | GitHub Pages / Vercel | 零後端 |
| 資料層 | 記憶體(`ObjectURL`) + IndexedDB(transformers.js 模型 cache) | 照片**不上傳**;ObjectURL 不持久化 |

---

## 為何用 fp32(代價是 ~1 GB 下載)

SmolVLM-256M 在 q4f16 / fp16 量化下會輸出退化(`)) )) ))` 重複塌縮、或 `20\n\n\n...` 之類垃圾),HF 官方 `smolvlm-webgpu` Space working code 直接走 fp32。詳細除錯路徑見 [`../case-studies/debug-caption-bug.md`](../case-studies/debug-caption-bug.md)。

| dtype | 下載量 | 輸出品質 |
|---|---|---|
| q4f16(本案 M1 規劃) | ~189 MB | ❌ 亂碼 |
| 全 fp16 | ~380 MB | ❌ 不同種類垃圾 |
| **全 fp32(目前)** | **~1 GB** | ✅ 自然英文描述 |

備案:若要壓下載量,可改用 `HuggingFaceTB/SmolVLM-500M-Instruct` 的 q4f16 變體(~357 MB,HF 自家有 working WebGPU Space)。這條 path 本 repo 還沒驗證過,留給課程進階學員試。

---

## 資料邊界(必看)

- **照片不上傳:** 推論在瀏覽器內(WebGPU + Transformers.js)。所有對外網路請求只發生在第一次載入模型(從 HuggingFace Hub 抓 ONNX + tokenizer + config 檔)。第二次以後從 IndexedDB cache 命中,**可以離線跑**。
- **不寫 `.env` / 不存 API key:** 純靜態、無後端、無金鑰需求。
- **預期對外網域**(用 DevTools Network 驗證):
  - `huggingface.co` — 模型 metadata + ONNX 檔
  - `cdn-lfs.huggingface.co` — LFS CDN(重定向後)
  - `cdn.jsdelivr.net` — ONNX Runtime WASM 載入器
- 任何其他對外網域 = 該檢查。完整安全驗證流程見 [`../case-studies/security-audit/runtime_monitor_sop.md`](../case-studies/security-audit/runtime_monitor_sop.md)。

---

## 想自己驗證資料邊界?

[`../case-studies/security-audit/`](../case-studies/security-audit/) 裡有完整的 SOP + 監控腳本,30 分鐘可以自己跑一次:

1. 開 DevTools Network 監看
2. 貼 `pictag-monitor.console.js` 安裝攔截
3. 跑載模型 → 推論 → 斷網 → 再推論
4. 對比 log,確認沒有「使用者圖片被上傳」的請求

---

## Stack 細節(改 code 之前先看)

- **Next.js 16 不等於你訓練資料裡的 Next.js** — API、慣例、檔案結構可能都不同。改 Next.js 特定 code 之前,讓 agent 先讀 `pictag-app/node_modules/next/dist/docs/` 對應的指南
- **App Router**(非 Pages Router)— `app/page.tsx` 是首頁
- **`"use client"`** 用在頂端標示這是 client component(模型推論需要瀏覽器 API)
- **HMR(Hot Module Reload)** 是 dev server 自帶功能,改 code 直接看;只有改 `next.config.ts` / 加套件才要重啟 dev server
