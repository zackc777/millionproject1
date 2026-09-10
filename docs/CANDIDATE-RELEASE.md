# 第一批 source 回收與信用卡修正候選版

> 2026-09-10 最新進度：使用者完成 GitHub App 安裝後，寫入已恢復。純來源交接已提交 PR #1（https://github.com/zackc777/millionproject1/pull/1）；候選版準備提交獨立 draft PR。下文的 GitHub 403 是先前阻礙紀錄。Vercel 與候選版瀏覽器驗收仍待完成，尚未發布正式站。


日期：2026-09-10。狀態：**本地完成；未提交遠端、未合併、未上線**。

## 分批提交

| 分支 | 預計 PR base | 內容 |
|---|---|---|
| `codex/source-handoff` | `main` | 22 個 Edge Functions、26 筆 migration 歷史、9 個前端 response、schema/RPC 與 audit；原 HTML 與 Vercel 設定不變 |
| `codex/source-handoff-card-consistency` | `codex/source-handoff` | 固定同源模組 build、信用卡一致性修正、驗證工具及本文件 |

第一批來源封存與第二批行為切換分開審查。第二批 PR 應維持 draft，直到後述瀏覽器與部署 gate 通過；第一批合併後再把第二批 base 改為 `main`。

## 本次修正

- 新增卡片共用日期與識別模型。日期以台北日曆日處理，結帳日包含當天，次月繳款，月底日數會截到有效日期。
- 快速記帳、每月財務、信用卡新增刷卡統一保存 `credit_card_id` 與相容的 issuer 字串。既有字串只有在唯一匹配時歸入單卡；不猜配同名資料、不在頁面載入時 backfill。
- 修改歷史消費保留卡片 ID；改成現金會清除 ID。停用卡不能新增消費，仍可維護既有紀錄。歷史資料尚依賴舊卡名時，先阻止會斷鏈的改名。
- 卡片刪除前同時檢查 ID 與舊名稱關聯。已有歷史改為停用；額度與結帳／繳款日仍可編輯。
- 繳款新增、編輯、刪除只影響 `credit_card_payments`，不產生第二筆支出。繳款查詢失敗時顯示錯誤；繳款日當天不顯示逾期。
- 月明細跨月編輯會重算舊、新兩個月份。投資類型仍由原 investment guard 轉交交易表單／交易 RPC。
- 查詢合併只共用同帳號尚未完成的請求，完成或寫入後不保留舊結果。信用卡預覽不再監聽自己的子樹更新，避免反覆刷新。

## Build 與 source of truth

`npm run build` 讀取現有 `index.html` 及 `src/`；移除遠端 `fetch + eval` loader，保留原本 9 模組的相對順序，之前先載入 2 個信用卡共用模組。輸出 11 個含內容 hash 的同源 JS，HTML 使用 SRI；模組載入失敗時阻止啟動應用並顯示重整入口。

`dist/release.json` 記錄 repository、commit、模組順序、SHA-256、SRI 與 HTML SHA-256。發布目錄固定為 `dist/`，不能直接發布根目錄 HTML。原有 Supabase JS 2.105.0 CDN 與資料 API 仍保留；本批移除的是遠端自訂 executable patch loader，並未宣稱消除全部外部依賴。

`supabase/functions/` 是原始封存，沒有配合本次前端修正重新部署。新前端邏輯只在 `src/` 維護；舊 Edge Functions 暫留供既有正式站使用及回退。不再同時維護兩套前端修改來源。

## 驗證紀錄

| 驗證 | 結果與限制 |
|---|---|
| `npm run check`，Node.js 24.19.0 | 18 項測試通過，build 成功 |
| 信用卡行為 | 實際 handler 配合離線資料庫替身，涵蓋新增／編輯／刪除／停用、結帳邊界、次月繳款、不重複支出、跨月修改、舊資料保護 |
| 投資分流 | 已驗證一般明細的投資類型仍轉交原投資新增／編輯／刪除入口；未在真實資料庫驗證 RPC 交易與並行 |
| 導覽及投資來源保留 | features、shell、icons、investment-core、investment-guard 的內容 hash 與正式 baseline 一致；不能替代實際 UI 回歸 |
| build 完整性 | 模組順序、同源 URL、SRI、HTML hash 與失敗時不呼叫 init 均通過離線檢查 |
| 正式站重查 | HTTP 200；HTML hash `7bac6d7ba5c782981902eae6cb2d63a8ec29076ae84c4cfcb41bc59a6881ed7a`，仍是 main `6a9dc771697e6d6cb9688b350a450b78e0737dd1` 的原版 |
| Supabase 版本重查 | 22 個函式的版本與平台 hash 均與封存相同；本次沒有修改正式資料／schema／函式／排程 |
| 瀏覽器 | 先前正式版桌機未登入導覽測過。候選版桌機與手機、登入後 CRUD 尚未通過，不可算已驗收 |

## 存取阻礙

GitHub 建立 tree 回覆 `403 Resource not accessible by integration`。Vercel project 查詢回覆 `403 Forbidden`，scope `z9000282-8151`（`team_NiXOiZoKbGaVArOOHRjglUmH`）。須恢復正確 repo 的寫入權限及 Vercel 團隊存取，才能提交分支、建立 PR、檢查 preview build、部署及核對 alias。沒有因權限不足改用其他 repo 或平台。

先前瀏覽器政策拒絕 data URL 的自訂手機測試頁；未繞過。後續須在允許的真實手機 viewport／裝置完成候選版驗收，不能把純函式測試當成手機測試。

## 接續驗收與上線

1. 重新核對 remote `main`、正式 HTML 和 Edge 版本；如有新變更，先增量整合，不能覆蓋。
2. 提交純來源 PR，再提交候選版 draft PR；先檢查 preview 實際 build。
3. 使用隔離資料與測試帳號驗證：桌機七個主模組、sidebar、手機底部導覽／更多、快速記帳、信用卡全 CRUD、投資交易全 CRUD、定期定額不造交易、舊持倉與官方／暫定行情標籤。注意既有登入流程會 seed、搬移設定及寫快照。
4. 建置預定 commit，對 preview 執行：

   ```sh
   node scripts/verify-release.mjs PREVIEW_URL FULL_COMMIT_SHA dist/release.json
   ```

   必須比對實際 HTML、release.json、11 個 JS endpoint 的內容，而非只看 READY。
5. 所有 gate 通過後才合併／發布。對正式 URL 重跑上述檢查，並重做桌機、手機核心流程。
6. 回退時切回已核對的前一個部署與其 alias。本批沒有 schema 變動，因此不需要回滾資料庫；舊部署仍依賴可變 Edge loader，回退前仍須核對封存的 Edge 版本／hash。

## 仍待處理的資料風險

多期未清帳款、超過 8 筆繳款的存取、信用卡帳單日變更對歷史歸屬、ID 跨帳號 DB 約束、並行交易鎖定、寫入冪等、歷史快照估值、行情同步授權、正式價防舊資料覆蓋、研究頁 Yahoo 路徑，以及舊全域函式與 render 包裝整理，均未宣稱在此批解決。
