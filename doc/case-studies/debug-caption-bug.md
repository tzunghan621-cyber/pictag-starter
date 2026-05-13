---
title: SmolVLM-256M caption 從亂碼修到可用 — 三項改動同時到位
type: devlog
tags: [pictag, M2, caption-fix, transformers.js, smolvlm, debug, devlog]
created: 2026-05-13
---

# 2026-05-13 caption 從亂碼修到可用

## 現象

[第四關 runtime monitor](./security-audit/runtime_monitor_20260513.md) 通過,但同期發現 caption 輸出是亂碼 — `)) )) )) )) ))` 樣式的重複退化,模型有跑、但 decoder 輸出無意義。**安全面 OK,功能面壞掉**。

## 除錯路徑(失敗組記錄,給未來自己 + 教案)

四種 dtype/sampling 組合都試過,**全失敗、退化型態各異**:

| 試驗 | dtype | sampling | 結果 |
|---|---|---|---|
| 1 | 全 q4f16(原配置) | greedy | `)) )) )) ))` 重複塌縮 |
| 2 | embed=fp16 / vision=fp16 / decoder=q4 | greedy | 完全空輸出(立刻 EOS) |
| 3 | 全 fp16 | greedy | `20\n\n\n...()` 不同型態垃圾 |
| 4 | 全 q4f16 | sampling t=0.7 rep_pen=1.2 | `dingsing on the ground...` 半英文片段 |

**訊號分析:**
- preprocessing 正常(`input_ids: [1, 878]`、`pixel_values: [1, 13, 3, 512, 512]` 完整 Idefics3 image splitting)
- 四種 dtype 各自不同退化 → 不是單純量化太狠,**像是 decoder 路徑與 transformers.js v4.2.0 對 SmolVLM-256M 處理有結構性 mismatch**

## 突破點:研究報告

派 subagent 跑 web research → [smolvlm_256m_caption_garbage_20260513](./research-reports/smolvlm_256m_caption_garbage_20260513.md)。

關鍵發現:HF 官方 [`smolvlm-webgpu` Space](https://github.com/huggingface/transformers.js-examples/tree/main/smolvlm-webgpu) working code 跟 pictag 有三項具體差異。沒人在 upstream 回報相同症狀 = 是 pictag **配置**問題,不是 library bug。

## 修法(三項同時到位才修好)

```diff
- const { AutoProcessor, AutoModelForImageTextToText, RawImage } = tx;
+ const { AutoProcessor, AutoModelForVision2Seq, RawImage } = tx;

- const model = await AutoModelForImageTextToText.from_pretrained(MODEL_ID, {
+ const model = await AutoModelForVision2Seq.from_pretrained(MODEL_ID, {
    revision: REVISION,
-   dtype: {
-     embed_tokens: "q4f16",
-     vision_encoder: "q4f16",
-     decoder_model_merged: "q4f16",
-   },
+   dtype: "fp32",
    device: "webgpu",
    progress_callback: onProgress,
  });

  const generated = await model.generate({
    ...inputs,
-   max_new_tokens: 60,
+   max_new_tokens: 256,
    do_sample: false,
+   repetition_penalty: 1.1,
  });
```

**三項缺一不可**(只試其中一兩項仍會壞,前述試驗 1–4 就是逐項試的結果)。

## 結果

對 `beach.png`(640×427)的描述:

> *In the center of the image there is a book, goggles and hat on the towel. On the left side of the image there are two glasses with drink in it. At the bottom of the image there is sand.*

完整英文、語意合理、定位準確。**推論時間 44.39s**(WebGPU + fp32,比 q4f16 慢但能用)。

## 代價 / 取捨

| 項目 | 修前(q4f16) | 修後(fp32) |
|---|---|---|
| 模型總下載 | ~189 MB | **~1 GB**(`decoder` ~670MB + `embed` ~240MB + `vision` ~95MB) |
| 推論時間(beach.png) | 11.93s(但輸出垃圾) | 44.39s |
| 輸出品質 | 完全不可用 | 自然英文描述 |
| IndexedDB 占用 | ~189 MB | ~1 GB |

**取捨判斷:** 對個人使用或批次跑一次的場景完全可接受(下載一次、之後 IndexedDB cache 命中),但**對「給陌生人 demo / 學員第一次 clone 跑」場景負擔大** — 可考慮 fallback 到 SmolVLM-500M q4f16(~357MB,HF 自己有對應 WebGPU Space 驗證可跑)。

## 動到的檔

```
M  pictag-app/app/page.tsx       # 三項配置改動 + UI 標籤更新
M  doc/security/model_safety_20260429.md  # dtype 從 q4f16 改 fp32,加 update 註記
A  doc/research/smolvlm_256m_caption_garbage_20260513.md  # subagent 研究報告
A  doc/devlog/20260513_caption_fix.md     # 本檔
```

## 學到的(操作面)

1. **subagent 在這種「我們配置 vs 上游 working 範例」的對比任務上 ROI 很高** — 比自己挖 6 個 GitHub PR 快太多
2. **「不同 dtype 不同退化型態」是個強訊號** — 不是單純 numerical issue,是 logits 路徑根本不對
3. **HF transformers.js 對 VLM 的「新版 vs 舊版 API」要看官方範例為準**,model card / blog 寫法常常落後或省略
4. **debug 區塊用 `<details>` 包好不刪** — 留著當教案素材(M4 教 vibe coding 時可以直接 show「印出 raw fullText 是怎麼讓你看出問題」)

## 待跟進

- [ ] M3 進場前在多張不同主題照片重測,確認不是只對 beach 一張幸運
- [ ] M4 教案化:評估 fallback SmolVLM-500M q4f16(下載量 357MB,平衡點)
- [ ] 第四關 runtime_monitor 報告中關於「revision pin 對 tokenizer_config 有破口」的 note,M5 部署前複驗
- [ ] (可選)`stripPrompt` 改成依 `promptLen` 切,不再 lastIndexOf("Assistant:")

## 相關連結

- [研究報告(subagent 產)](./research-reports/smolvlm_256m_caption_garbage_20260513.md)
- [HF 官方 smolvlm-webgpu Space](https://github.com/huggingface/transformers.js-examples/tree/main/smolvlm-webgpu)
- [第三關模型安全(已更新 dtype)](./security-audit/model_safety_20260429.md)
- [第四關 runtime monitor](./security-audit/runtime_monitor_20260513.md)
