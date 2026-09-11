# millionproject1

個人財務與投資管理平台。正式站：https://millionproject1.vercel.app/

唯一維護 repository：`zackc777/millionproject1`，正式分支：`main`。
先讀 [維護交接](docs/HANDOFF.md) 與 [候選版本驗收](docs/CANDIDATE-RELEASE.md)。

```sh
npm test
npm run build
```

Node.js 22 以上，建置不需要新增第三方套件。對外發布的目錄是 `dist/`。
根目錄的 `index.html` 是基底原始碼，不能直接當成新版 build 發布。

| 位置 | 用途 |
|---|---|
| `index.html` | 既有頁面與核心邏輯，漸進整理 |
| `src/runtime/` | 從正式 response 回收的前端模組，後續修正在此維護 |
| `src/card-model.js` / `src/card-service.js` | 共用信用卡日期、識別與寫入邊界 |
| `supabase/functions/` | 稽核時取得的 Edge Functions 來源快照；不是整批部署清單 |
| `supabase/history/` | 原有 migration 歷史封存，不可直接重播到正式資料庫 |
| `docs/baseline/` | 稽核基準、版本、雜湊及 schema/RPC 契約 |
| `dist/release.json` | 每次 build 的 commit、模組及 HTML 指紋 |
