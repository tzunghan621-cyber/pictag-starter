# GitHub 帳號 + Push 上去 · 學員 SOP

> **這份是給接手 agent 看的**——學員 clone 這個 repo 後，跟 agent 說：
>
> > 「請看 `doc/manuals/github-setup-sop.md`，一步一步帶我把這個專案 push 到我自己的 GitHub。」
>
> agent 應該照本 SOP 順序進行，**每一段做完都跟學員確認再進下一段**。

---

## Agent 工作原則

1. **一段一段做** — 學員每完成一段，agent 要問「OK 嗎？看到 X 畫面了嗎？」，確認再進下一段
2. **解釋為什麼** — 不要只丟指令，要說「我們現在做這個是因為 OO」
3. **遇到錯誤先排查** — 不要直接砍掉重來，先看錯誤訊息
4. **敏感操作要確認** — push 前一定要跑「四查」（§4），有任何疑似敏感資料要學員拍板才能繼續

---

## §1 申請 GitHub 帳號（沒帳號才做）

**有帳號的跳到 §2。**

### 1.1 開 signup 頁

帶學員開 https://github.com/signup，依序填：

- **Email**：常用 email
- **Password**：≥15 字 或 ≥8 字含數字+小寫
- **Username**：⚠️ 提醒學員——這個之後別人看 repo 會一直看到
  - 建議：真名拼音 / 專業 handle（`tzunghan-lu`, `john-tng`）
  - 避免：黑歷史暱稱、生日數字
  - 取了改名很麻煩，**第一次就取好**

驗 email → 帳號啟用。

### 1.2 跳過廢話

- 「你團隊多大」「寫什麼語言」→ 隨便
- 「要不要訂 Copilot」→ **跳過**（要錢）

---

## §2 帳號層級隱私設定（重要！commit 前要先設）

> agent 帶學員一個一個做，每個做完截圖確認。

### 2.1 Email Privacy

進 **Settings → Emails**，把這兩個勾起來：

- ✅ **Keep my email addresses private**
- ✅ **Block command line pushes that expose my email**

**為什麼**：不設這個，commit 會把真 email 寫進去，任何人在 GitHub 都查得到 → 垃圾信會多到爆。設了之後 GitHub 給你假 email（`12345+username@users.noreply.github.com`）。

### 2.2 關掉「拿你的 code 訓練 AI」

進 **Settings → Copilot → Policies**：

- ❌ **Allow GitHub to use my code snippets from code completion for product improvements** — 取消勾選
- ❌ **Allow GitHub to use my data from Copilot Chat for product improvements** — 取消勾選

**為什麼**：不關 = 你寫的 code + 跟 Copilot Chat 講的話會被拿去訓練 GitHub 的 AI 模型。你的商業邏輯、客戶資料、實驗想法可能就外流到別人的補全建議。即使現在沒用 Copilot 也先關，以後開來用就立即生效。

**注意**：這個設定**不影響 public repo 的公開度**——public repo 的 code 本來就是公開的。這個管的是「你跟 Copilot 互動的內容」。

### 2.3 開 2FA（兩步驟驗證）

**強烈建議當下就開**——GitHub 帳號被盜 = 你寫的所有 code 可能被亂改、被刪。

進 **Settings → Password and authentication → Two-factor authentication → Enable 2FA**：

- 選 **Authenticator app**（手機裝 Google Authenticator 或 Microsoft Authenticator）
- App 掃 QR Code → 輸入 6 位數 → 啟用
- ⚠️ **存好 recovery codes**：手機掉了用這個救帳號
  - 截圖存雲端 / 印出來放抽屜 / 存密碼管理器
  - 不要只留在 GitHub 網頁——你登不進去就拿不到

agent 要等學員確認 recovery codes 存好了，**再繼續**。

---

## §3 裝 `gh` CLI + 登入

### 3.1 裝

```powershell
winget install GitHub.cli
```

裝完開新 PowerShell 視窗（環境變數要重載）。確認：

```powershell
gh --version
```

### 3.2 登入

```powershell
gh auth login
```

互動選：
- **GitHub.com**
- **HTTPS**
- **Login with web browser**

照終端機顯示的裝置碼貼到瀏覽器（會自動開）。完成後：

```powershell
gh auth status
```

看到綠勾就成。

---

## §4 push 前的「四查」⚠️ 最重要

agent 要逐項跑、有任何疑慮**停下來問學員**，不要自己決定要不要 push。

### 查 1：API key 沒寫死

```powershell
git grep -E "sk-[a-zA-Z0-9]{20}|hf_[a-zA-Z0-9]{20}|AKIA[A-Z0-9]{16}|api[_-]?key\s*=\s*['""]"
```

抓 OpenAI / HuggingFace / AWS / 通用 `api_key="..."`。有東西跳出來 → **停**，搬去 `.env` + 加 `.gitignore`。

### 查 2：`.env` 沒被加進去

```powershell
git ls-files | Select-String -Pattern "\.env|secrets|credentials"
```

應該空白。有的話：`git rm --cached <檔案>` + 確認 `.gitignore` 有擋。

### 查 3：個人路徑沒寫在 code

```powershell
git grep -E "C:\\\\Users\\\\|/Users/|/home/[a-z]+/"
```

有東西 → 改成相對路徑或環境變數。

### 查 4：`node_modules` 沒被推

```powershell
git ls-files | Select-String "node_modules"
```

應該空白。有的話：`.gitignore` 補上 `node_modules/`、然後 `git rm -r --cached node_modules`、重 commit。

---

## §5 開 repo + push（一行搞定）

```powershell
# 在改造好的專案根目錄

# Step 1: 砍掉 starter 帶來的 git history（fresh start）
Remove-Item -Recurse -Force .git
git init -b main

# Step 2: 再跑一次「四查」確認

# Step 3: 第一個 commit
git add .
git commit -m "Initial commit: my <專案名> (forked from pictag-starter)"

# Step 4: 開 repo + push（一行）
gh repo create <你的專案名> --public --source=. --push --description "<一句說明>"

# Step 5: 開 repo 看
gh repo view --web
```

agent 要替學員填好 `<專案名>` 跟 `<一句說明>`，**送出前讓學員確認**這兩個。

---

## §6 push 完，每個 repo 都要開的兩個防護

進 **Repo Settings → Code security and analysis**：

- ✅ **Dependabot alerts: Enable**——npm 套件有 CVE 自動通知
- ✅ **Secret scanning: Enable**——GitHub 會掃 commit 看有沒有 API key 漏出去（漏了會 email 你 + 自動撤銷部分廠商的 token）

兩個都免費、默默幫你顧，**每個新 repo 都要開**。

---

## §7 不小心推了敏感資料 🚨

**順序很重要，agent 帶學員照這個救**：

1. **先撤 token，不是改 code**
   - 推上去那一刻就視為已洩——立刻去 OpenAI / Anthropic / HuggingFace dashboard 撤銷該 token
   - 改 code 沒用，舊 commit 還在 git log，GitHub 還搜得到

2. **再決定要不要救 repo**
   - **個人練習 repo**：直接砍掉重來最快 `gh repo delete <名> --yes`
   - **要保留 history**：用 [`git filter-repo`](https://github.com/newren/git-filter-repo) 重寫歷史 + force push（進階，agent 帶著做）

3. **絕對不要**：只 delete 檔案 + 新 commit——舊 commit 還在 git log，公開 repo 搜得到

---

## §8 常見地雷對照表

| 卡點 | 怎麼救 |
|---|---|
| `gh auth login` 卡在等裝置碼 | 瀏覽器沒登入 GitHub → 先登 → 重跑 |
| `gh repo create` 說 `name already exists` | 你帳號下已有同名 repo → 換名 or `gh repo delete <名>` |
| push 後網頁看不到檔案 | default branch 不是 main → `git push -u origin main` |
| commit 顯示作者是 `root` 或別人 | git 沒設 user → `git config --global user.email "..."` + `git config --global user.name "..."` |
| node_modules 也被推上去 | `.gitignore` 沒在第一次 commit 前就生效 → `git rm -r --cached node_modules` + 重 commit |
| 2FA 手機掉了登不進去 | 用 recovery codes（§2.3 要學員存好的那個） |

---

## 完成檢核

agent 帶完後，跟學員確認都打勾：

- [ ] GitHub 帳號可登入
- [ ] Email privacy 設好（§2.1）
- [ ] Copilot 訓練同意關掉（§2.2）
- [ ] 2FA 開了 + recovery codes 存好（§2.3）
- [ ] `gh auth status` 綠勾
- [ ] 「四查」全過（§4）
- [ ] repo push 成功，網頁看得到檔案
- [ ] Dependabot + Secret scanning 開了（§6）

全打勾 = 學員從消費者跨到生產者的第一步完成 🎉
