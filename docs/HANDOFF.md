# 維護交接

> 2026-09-11：GitHub 寫入已恢復。PR #1 為來源封存，draft PR #2 包含固定 build、信用卡修正與本輪現金流／滾動配置。36 項離線測試通過；尚未合併或上線。詳細進度見 `docs/CASHFLOW-2026-09-11.md`。

目標只有 `zackc777/millionproject1`。正式分支 `main`，正式站 https://millionproject1.vercel.app/。

## 現況基準

2026-09-10 的正式 HTML 和 main `6a9dc771697e6d6cb9688b350a450b78e0737dd1` 完全相同。`docs/baseline/release.json` 保存 HTML 與 9 個必要前端模組的 SHA-256、有效載入順序；`function-versions.json` 保存全部 22 個 Supabase Edge Functions 平台版本。

`codex/source-handoff` 中的 `src/runtime/` 是已解包的正式 browser response，不是從早期檔案推測重建。後續候選分支的差異見 `docs/CANDIDATE-RELEASE.md`。`supabase/functions/` 保留取得的 23 個來源檔（investment-core 有兩個檔案）。其中未載入的舊／測試函式不應整批重部署。

`supabase/history/` 保存原有 26 筆 migration。`docs/baseline/schema-contract.json` 與 `database-functions.json` 保存現行 schema/RPC。歷史 migration 和現行狀態有漂移（例如排程），須在隔離環境對照後才可建立可重播 baseline。這次沒有對正式資料庫執行 schema 或資料變更。

完整稽核與逐函式清單在 `docs/baseline/audit-2026-09-10.md`。

## 必須保留的契約

- 定期定額只開啟實際買入表單，不生成成交紀錄。
- 實際交易保存日期、標的、金額、數量、成交價，透過既有 RPC 同步 finance entry 和 portfolio。
- 台新 17 日結帳／次月 2 日繳款；富邦、國泰 24 日結帳／次月 9 日繳款。額度可編輯，卡片可停用並保留歷史。
- 刷卡日期認列支出；繳款保存在 credit_card_payments，不再產生 expense。
- 當日正式日行情未發布時才接受盤後 MIS 最後成交價，顯示「盤後暫定」；正式價發布後才顯示「官方正式收盤」。
- sidebar、手機底部導覽／更多、快速操作與原模組是回歸驗收範圍。

## 發佈前缺口

GitHub PR #1 與 #2 已建立，後續應更新這兩個 PR。Vercel 與實際候選瀏覽器驗收仍未完成。

Vercel scope `z9000282-8151`（team_NiXOiZoKbGaVArOOHRjglUmH）目前連線回覆 403，需取得此 scope 存取後核對 production alias、build 設定和 logs。GitHub status 所指的既有部署為 `5jb9LYxSeiCwnLmSHragFDjR9Gap`；不能把它未經核對地當作目前 alias deployment。

桌機未登入 sidebar、導覽切換、快速操作開關已實測。登入後資料 CRUD、手機實際 viewport／觸控流程仍是未通過的發佈 gate。瀏覽器政策拒絕 data URL 的自訂手機測試頁；不繞過該限制。只把離線純函式測試當作邏輯驗證。

## 後續優先項目

1. 信用卡穩定 ID、結帳日當天歸屬、舊字串唯一匹配。
2. 跨月交易與歷史快照估值、投資並行寫入、RPC 關聯 ownership。
3. 行情寫入授權、同日正式價優先與防止舊價格回蓋、研究頁舊 Yahoo 路徑。
4. 多期未清帳款與完整歷史繳款入口已在候選版完成，待實際驗收。
5. 移除多層 render 包裝、重複 quality code 與日期 Proxy。

每批修改需記錄做了什麼、如何測試、是否上線。使用者回報的問題加入此清單；不能把部署權限不足說成網站已修好。

目前候選修改及 36 項離線測試結果見 `docs/CANDIDATE-RELEASE.md`。純來源交接分支與原 main 的 `index.html`、`vercel.json` 相同；候選分支才切換 build 與信用卡邏輯。
