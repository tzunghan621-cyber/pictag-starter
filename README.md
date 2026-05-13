# PicTag — 圖片批次描述工具

> 瀏覽器端 AI 圖片描述。拖入照片,本地推論生成描述文字 — **不上傳、不花 API 費**。
>
> 這是 TJM「Claude 系列 06:從消費者到生產者」課程的起點 repo。
> 你會 clone 這個 repo → 改成自己的版本 → push 到你自己的 GitHub。

---

## 30 秒看懂

| 項目 | 用什麼 |
|---|---|
| 框架 | Next.js 16(Static Export、純前端) |
| AI 推論 | `@huggingface/transformers` v4.2.0 |
| 模型 | `HuggingFaceTB/SmolVLM-256M-Instruct`(瀏覽器端) |
| GPU | WebGPU(Chrome / Edge 113+) |
| 部署 | GitHub Pages / Vercel — 零後端 |
| 資料 | 全部在你的瀏覽器,**照片不上傳** |

---

## 快速跑起來

```bash
cd pictag-app
npm install
npm run dev
```

瀏覽器開 **http://localhost:3000**。

⚠️ **第一次跑會下載 ~1 GB 的模型檔到瀏覽器 IndexedDB**(SmolVLM-256M fp32 ONNX)。
之後重開都是秒載入。網路慢或頻寬有限請先評估。

詳細技術組合與權衡見 [`doc/manuals/project_overview.md`](doc/manuals/project_overview.md)。

---

## 怎麼改成你自己的(課堂示範流程)

### 1. 改專案名

- 把整個資料夾改名(`pictag-starter` → 你想的名字)
- 改 [`pictag-app/package.json`](pictag-app/package.json) 的 `"name"` 欄位

### 2. 改內容(vibe coding)

打開 Claude Code / Claude Desktop 接這個 repo,跟你的 agent 說:

- 「把標題改成 XX」「把背景色從淺灰改成淺藍」
- 「加一顆按鈕做 OO」
- 「prompt 從 `Describe this image in one short sentence.` 換成 `Identify the food in this image.`」

→ 改完瀏覽器自動 reload(Next.js dev server 內建 HMR),立刻看到變化。

### 3. 開你自己的 GitHub repo

```bash
# 砍掉這個 repo 帶來的 .git,重開乾淨的
rm -rf .git
git init -b main
git add .
git commit -m "Initial commit"

# 在 GitHub 開新 public repo(網頁操作),拿到 URL 後:
git remote add origin https://github.com/<你的帳號>/<repo名>.git
git push -u origin main
```

---

## 想看背後怎麼建出來的?

[`doc/case-studies/`](doc/case-studies/) 收錄了三份真實的開發案例,可以當「AI-assisted 開發長什麼樣」的閱讀材料:

| 案例 | 學到什麼 |
|---|---|
| [security-audit/](doc/case-studies/security-audit/) | 用 AI 對開源依賴做完整安全檢查(四關:信譽 / 程式碼掃描 / 模型來源 / 執行時監控) |
| [debug-caption-bug.md](doc/case-studies/debug-caption-bug.md) | Caption 亂碼從發現 → 4 種配置除錯 → 派 subagent 研究 → 三項改動修好,完整 vibe debugging 過程 |
| [research-reports/](doc/case-studies/research-reports/) | 用 Claude subagent 跑技術研究、產出研究報告的範例 |

---

## License

[MIT](LICENSE)

---

## 來源

這份起點 repo 由 [tzunghan621-cyber](https://github.com/tzunghan621-cyber) 為 TJM Claude 系列 06 課程整理。
