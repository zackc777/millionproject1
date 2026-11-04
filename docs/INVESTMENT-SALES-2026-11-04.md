# 買賣與交割款 · 2026-11-04

基底 main：c2403675d68ae65d04471c2389029736b6a054af。僅修改 millionproject1。

## 資料契約

- investment_transactions.side 接受 buy / sell；新增 tax、settlement_date、trade_sequence、cost_basis、realized_pnl。
- amount：買入為實際扣款成本；賣出為扣手續費、交易稅後淨額。
- 期初部位與交易按日期、同日先後、建立時間及 ID 重播，採移動平均成本。所有買賣新增／修改／刪除，以及期初部位修改／移除，都重播持倉和後續已實現損益。當時數量不足即拋錯並回滾整筆操作。
- 同一天有多筆交易時，表單預設下一個順序，可依實際成交先後調整。此成本方法不是券商指定批次或稅務申報的計算保證。
- 完全出清後保留零股數 portfolio 行，避免丟失期初部位而無法正確撤銷賣出；畫面將出清部位另列，仍可管理期初資料。
- 未入帳賣出不建立 finance_entries，淨額列 pendingInvestmentSales 應收交割款，計入資產但不計入可花現金。確認實際入帳日期後才建立 investment_sale 金流；刪除或改回未入帳會同步移除金流。
- investment_sale 是投資回收而非薪資收入，依入帳日期增加現金；對帳日以前的補登不再加到已核對銀行餘額上。
- 新 RPC 使用 SECURITY INVOKER、既有 ownership RLS、固定 search_path、使用者範圍 advisory transaction lock；編輯／刪除有 updated_at 衝突檢查，新建有 request UUID 重試防重複。舊買入 RPC 包裝至新實作，舊頁面不能將已存在賣出改成買入。
- 避免「累計買入本金－剩餘成本」把已出售部位算回資產：未建立持倉投入改以尚未連結交易的 finance entry 計算。待入帳款另列，已實現損益不另外重複加進資產。

## 介面與整合

投資頁新增買入／賣出按鈕，持股列直接開啟賣出表單。保留實際費稅、同日順序及實際入帳日；未入帳預設留白，不猜交割日或銀行假日。已出清交易仍可於歷月紀錄查看、編輯與刪除，明細每頁八筆。

投資頁顯示持倉市值、未實現損益、累計已實現損益與待入帳款。入帳確認開啟原交易並預填今天，仍需使用者核對日期、儲存。配置改用與首頁相同的 ledger / rolling，避免引用舊收入比例公式。

總覽資產圓環與百萬目標包含待入帳交割款；每月財務另列賣出入帳，金流長條與對帳算法同步；每月明細編輯／刪除 investment_sale 會回到交易 RPC，不直接改連動金流。定期定額仍只建立買入計畫，不自動生成成交。

## 發布與驗證範圍

Supabase migration investment_sales 已成功套用；catalog 已確認 v2 RPC、固定 search_path、SECURITY INVOKER 與 authenticated-only 呼叫權。Advisors 與修改前相同，沒有新增警告；既有 app_versions 無政策、set_updated_at search_path、外洩密碼防護設定不在本次變更範圍。

CLI 建立 migration 檔後，外部 PostHog 遙測被自動審核拒絕；未重試遙測，後續透過已授權的 Supabase MCP 套用。

依使用者不要測試的要求，僅執行 build 語法／打包檢查與唯讀 schema 核對；未執行交易寫入測試、測試套件或桌機／手機 UI 驗收。實際部署結果以工作回覆與 GitHub status 為準。

不替使用者新增任何實際買賣或改動既有帳務。此 migration 不重播現有資料；後續經使用者儲存交易時才更新對應持倉及衍生成本。

回退：前端可回退舊提交，資料庫新增欄位保留。已有賣出時不可回退成只累加買入的舊 rebuild 函式，否則會復活已賣出的持倉。
