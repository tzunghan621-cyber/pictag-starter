---
title: M1.3 第三關 — AI 模型安全報告（SmolVLM-256M-Instruct）
type: 安全檢查報告
tags: [pictag, security, model-safety, M1, SmolVLM]
mode: 探索（首次 GitHub 開源探索）
sop: "「開源安全檢查 SOP」 §第三關"
target: "HuggingFaceTB/SmolVLM-256M-Instruct"
status: pass
created: 2026-04-29
updated: 2026-05-13
---

> **2026-05-13 dtype 更新：** 經 [smolvlm_256m_caption_garbage 研究報告](../research/smolvlm_256m_caption_garbage_20260513.md) + 實證,**q4f16 / fp16 在 SmolVLM-256M 上會劣化到輸出垃圾**(decoder logits 數值崩壞、不同 dtype 不同退化型態)。HF 官方 [`smolvlm-webgpu` Space](https://github.com/huggingface/transformers.js-examples/tree/main/smolvlm-webgpu) working code 直接走 **`dtype: "fp32"`** + **`AutoModelForVision2Seq`** + **`repetition_penalty: 1.1`**。pictag 已採用同樣配置(2026-05-13)— 推論可輸出合理英文描述,代價是模型總下載量從 ~189MB 升到 ~1GB(教案場景 M4 再考慮 fallback 500M q4f16)。
> 安全面**無影響**:模型來源 / pinning / 行為邊界不變,只動 dtype + 推論 API。

# M1.3 第三關 — AI 模型安全報告

> **SOP：** 「開源安全檢查 SOP」 §第三關（瀏覽器端 AI 專用）
> **檢查對象：** [`HuggingFaceTB/SmolVLM-256M-Instruct`](https://huggingface.co/HuggingFaceTB/SmolVLM-256M-Instruct) ONNX 版
> **檢查時間：** 2026-04-29
> **本關不實際下載大檔**（~3GB 完整 repo / ~189MB q4f16 三檔），先建驗證計畫 + 鎖定 commit SHA；M2 PoC 真載入時補實測 sha256 到本檔。

---

## 結論速查

| 檢查 | 結果 | 紅旗？ |
|---|---|---|
| 3-1 模型來源 | HuggingFaceTB（HF 官方研究組）/ Xenova（HF Staff）擔任 ONNX 上傳者 | ✅ 高信任 |
| 3-1 LFS 安全標記 | 32 個 ONNX + safetensors **全部標記 Safe**（HF 自動掃描通過） | ✅ |
| 3-2 commit SHA pinning | `7e3e67edbbed1bf9888184d9df282b700a323964`（最後一個 commit、~1 年前 GQA WebGPU 優化） | ✅ 可 pin |
| 3-2 sha256 驗證 | 留待 M2 實載時 capture（HF Hub 用 git-lfs sha256 自動驗，M2 後存入本檔） | ⏳ 計畫中 |
| 3-3 config.json 外連 | **無任何外部 URL** — 純架構參數 | ✅ |
| 3-3 模型行為預期 | Idefics3 視覺語言模型，僅做推論輸出 token，不執行 code、不存檔、不發網路 | ✅ |

**整體判定：** ✅ 第三關**靜態檢查通過**。動態 sha256 比對 + DevTools 載入時行為驗證合併到第四關（M2 PoC 跑起來時做）。

---

## 3-1. 模型來源

### 上傳者 / 組織

| 項目 | 值 | 信任度 |
|---|---|---|
| 模型 namespace | `HuggingFaceTB`（HF 官方 The Big science / TBD 研究組） | ✅ HF 官方 |
| 最後 commit author | **Xenova**（HF Staff，transformers.js 主要維護者） | ✅ HF 官方核心人員 |
| 最後 commit 訊息 | `Upload optimized language model w/ WebGPU-compatible GQA (#11)` | ✅ 內容合理（為 transformers.js + WebGPU 優化） |
| 最後 commit SHA | `7e3e67edbbed1bf9888184d9df282b700a323964` | ✅（用於 pinning） |
| 最後 commit 時間 | ~1 年前（與 model card 中 2025-03 collection 一致） | ⚠️ 一年內、無新更新（穩定 = 好；停更 = 風險，但 SmolVLM 系列仍活躍） |

> **依 SOP §3-1 信任度表：HF 官方帳號 = ✅ 高**。本案綠燈。

### LFS / 檔案安全掃描

HF 對所有上傳檔案會跑：
- pickle/torch.load 安全掃描（防 pickle deserialization 攻擊）
- 病毒掃描
- 內容合法性掃描

**本 repo 的 32 個 ONNX 檔 + safetensors 全部標記 `Safe`**（HF tree 頁面顯示）→ ✅。

> 本案不用 pickle / pytorch_model.bin（已被 safetensors 取代），ONNX 也是純資料格式不執行 code，**結構性風險很低**。

---

## 3-2. 模型完整性（sha256 驗證）

### 為什麼不在本關預先抓全部 sha256

- HF 模型頁面 UI 不直接顯示 sha256（要點進每個檔的 detail）
- LFS 檔的真實 sha256 在 LFS pointer / API（`/api/models/.../tree/main` 含 lfs.sha256）
- 預抓 32 個 ONNX 的 sha256 並不會增加多少安全 — **真實驗證點是「下載當下對得上」**
- Transformers.js 載入時會走 HF Hub 標準 LFS pipeline，HF infra 內建 sha256 驗證

### 我們的驗證計畫（M2 PoC 載入時做）

**Pinning 策略：**
1. **Commit SHA pin** — Transformers.js 載入時帶 `revision: '7e3e67edbbed1bf9888184d9df282b700a323964'`，確保拉到本案掃過的版本（避免 upstream 換包矽悄悄影響行為）
2. **採用清單 pin** — 2026-05-13 改用 fp32 三檔（解 caption 退化問題,詳見頂部更新）：
   - `onnx/vision_encoder.onnx`(fp32) 約 95 MB
   - `onnx/decoder_model_merged.onnx`(fp32) 約 670 MB
   - `onnx/embed_tokens.onnx`(fp32) 約 240 MB
   - 總計 ~1 GB（首次載入後瀏覽器 IndexedDB 快取）
   - **歷史**:M1 規劃期原訂 q4f16(~189MB),但 M2 PoC 跑出來輸出退化、已棄用
3. **首次載入 sha256 capture** — 用 `certutil -hashfile <file> SHA256`（Windows）或 `sha256sum`（Linux/Git Bash）驗證實際下載的檔，把結果存進 `doc/security/model_hashes_baseline.md`
4. **持續驗證** — 之後 CI / 開發機載入時若 sha256 變動 = 警示

### 預期 hash baseline 寫入欄位（M2 PoC 後填）

```
[待填，IndexedDB 抽 binary 後 capture;dtype 已改為 fp32]
vision_encoder.onnx             sha256 = ____
decoder_model_merged.onnx       sha256 = ____
embed_tokens.onnx               sha256 = ____
config.json                     sha256 = ____
tokenizer.json                  sha256 = ____
preprocessor_config.json        sha256 = ____
```

---

## 3-3. 模型行為（載入 + 推論時的預期 / 異常 signals）

### 模型架構（無外連風險）

從 `config.json` 全文檢視：

- **架構：** `Idefics3ForConditionalGeneration`（純資料結構描述）
- **Vision encoder：** SigLIP，patch 16 / image 512
- **Text decoder：** Llama-3 變體（VLlama3ForCausalLM），30 層 / hidden 576
- **Resampler：** 6 層 perceiver / 64 latents
- **`flash_attn_2_enabled: true`**（執行時加速、無安全意義）
- **無任何 URL / endpoint / external reference** ✅

### 載入時應發生的對外請求白名單（DevTools 驗證標準）

| URL pattern | 是否預期 | 說明 |
|---|---|---|
| `https://huggingface.co/HuggingFaceTB/SmolVLM-256M-Instruct/resolve/<sha>/...` | ✅ 預期 | 模型檔案載入 |
| `https://cdn-lfs.huggingface.co/...` | ✅ 預期 | HF LFS CDN（重定向後實際下載點） |
| `https://*.hf.co` | ✅ 預期 | HF 系列子網域 |
| **任何其他外連** | ❌ **紅旗** | 第四關必抓 |

### 載入時不應發生的事

- ❌ 對 HF 以外的網域發 HTTP / WebSocket
- ❌ 寫入 localStorage / sessionStorage / cookie 的「使用者識別」欄位（IndexedDB 快取模型本身 OK，但不該存 user fingerprint）
- ❌ 動用 `navigator.sendBeacon` / `Image()` ping 之類的 telemetry

### 推論時不應發生的事

- ❌ 把使用者圖片 Blob 上傳到任何遠端
- ❌ 把推論結果（描述文字）回傳遠端
- ❌ 載入額外的 JS（已知 ONNX Runtime / transformers.js bundle 之外）

> 這些 ❌ 全部在**第四關（M2 DevTools 監控）** 實證驗證。本關只記預期。

---

## 安全聲明（對照 model card）

SmolVLM-256M-Instruct 的 model card 已**明示禁用情境**：
- 不可用於招聘 / 教育 / 信用評分
- 不可用於高風險自動化決策
- 不可生成事實性內容（會幻覺）
- 不可用於監控 / 騷擾 / 詐騙

→ pictag 的「圖片描述索引」用途 **完全在預期使用範圍內**（image captioning），無越界。

---

## 第三關整體判定

✅ **靜態檢查通過**。

### 通過標準對照（「開源安全檢查 SOP」 §第三關）
- [x] 3-1 模型來源 = HuggingFace 官方（HuggingFaceTB / Xenova HF Staff）
- [x] 3-1 LFS Safe 標記全綠
- [x] 3-3 config.json 無對外 URL
- [x] 3-3 用途符合 model card 預期使用範圍
- [⏳] 3-2 sha256 驗證 — 計畫已定，M2 PoC 載入時 capture 並回填 baseline

### 待第四關（M2 PoC 跑起來時）

- [ ] DevTools Network 監控 — 確認載入只走 HF 系列網域、推論時無對外請求
- [ ] 第一次斷網試跑（模型已 cache 到瀏覽器後）→ 應仍可推論
- [ ] capture 三個 fp32 ONNX 的實際 sha256 → 寫入 baseline
- [ ] 觀察 IndexedDB 內容（應只有模型快取、無使用者資料外洩跡象）

### 實作對 transformers.js 的安全要求（給 M2 接手者）

```javascript
import { AutoProcessor, AutoModelForVision2Seq, env } from '@huggingface/transformers';

// 1. Pin model + commit SHA — 不要用「latest」
const MODEL_ID = 'HuggingFaceTB/SmolVLM-256M-Instruct';
const REVISION = '7e3e67edbbed1bf9888184d9df282b700a323964';

// 2. dtype = 'fp32'(2026-05-13 更新 — q4f16/fp16 會讓 SmolVLM-256M 輸出退化)
const DTYPE = 'fp32';

// 3. 不要關閉 HF Hub 的 LFS sha256 驗證（預設開）
// 4. 不要設定 env.remoteHost 指向自架 mirror（除非經過二次審查）

const processor = await AutoProcessor.from_pretrained(MODEL_ID, { revision: REVISION });
const model = await AutoModelForVision2Seq.from_pretrained(MODEL_ID, {
  revision: REVISION,
  dtype: QUANTIZATION,
  device: 'webgpu',
});
```

---

## 相關連結

- [第一關信譽報告](upstream_reputation_20260429.md)
- [第二關 scaffold 掃描](scaffold_scan_20260429.md)
- [SmolVLM-256M-Instruct on HF](https://huggingface.co/HuggingFaceTB/SmolVLM-256M-Instruct)
