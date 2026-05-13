# PicTag — 給接手 Agent 的指引

> 這是 TJM Claude 系列 06 課程的起點 repo。
> 學員 clone 你接著 → 改造成自己的版本 → push 到自己的 GitHub。
> 你的工作是幫學員推進這個流程,**邊做邊解釋你在改什麼**。

---

## 工作慣例

- **動的範圍:** `pictag-app/` 是主要工作區。`doc/case-studies/` 是參考案例,**不要動**。
- **教 vibe coding:** 學員是在看你怎麼跟 AI 協作,所以邊改邊用人話解釋:你看到什麼、為什麼這樣改、改完會怎樣。
- **小步快跑:** 一次改一件事、確認瀏覽器 reload 看到效果、再進下一個改動。不要一次塞太多。
- **先讀再改:** 改 Next.js 特定 API 之前,先看 `pictag-app/node_modules/next/dist/docs/` 對應的指南。Next.js 16 的 API 可能與你訓練資料裡的不同。

## 不要做

- ❌ **加 API key 進 code** — 這個 repo 是 public,push 上去就洩了
- ❌ **寫個人路徑**(`C:\Users\...`、`/Users/...` 之類)— 換電腦就壞
- ❌ **引入需要後端的功能** — 維持純靜態,放棄這個 repo 的「不上傳、零後端」優勢就破壞整個專案
- ❌ **改 dtype / model 配置** — `app/page.tsx` 裡的 `dtype: "fp32"` 是經過除錯確定的(詳見 `doc/case-studies/debug-caption-bug.md`),量化版會輸出亂碼

## 推進路線範例

學員可能會說「我想做 OO 工具」。常見改造方向:

1. **換 prompt** — 把 `Describe this image in one short sentence.` 換成你想要的(食物辨識 / 商品分類 / 寵物描述...)
2. **改 UI 標題 + 色系** — Tailwind class 直接改、Hot reload 看到
3. **加按鈕** — 例如「複製描述到剪貼簿」「下載結果為 JSON」
4. **加批次處理** — 多檔上傳、佇列、進度條(進階)

每一條都可以從幾分鐘的小改動開始,別一上來就推大架構改動。

## 學員 push 到自己 GitHub 的流程

```bash
# 在改完的 repo 內
rm -rf .git              # 砍掉這份 starter 的 git
git init -b main
git add .
git commit -m "Initial commit"

# 學員去 GitHub 開 public repo,拿 URL 後:
git remote add origin https://github.com/<學員帳號>/<repo名>.git
git push -u origin main
```

push 前再確認:
- 有沒有寫死 API key?
- 有沒有個人路徑?
- 有沒有 commit 到 `.env` 之類?
