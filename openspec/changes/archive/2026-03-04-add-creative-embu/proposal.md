# add-creative-embu

## Why

系統目前僅支援「雙人演武」一種比賽項目。為了讓平台能服務更多種類的柔術競賽，需要新增「創意演武」項目，支援獨立的評分規則（技術分＋表演分各自 0–9.5 分、0.5 分間隔，分開計算後合計）、計時功能（1:30–2:00分鐘限制）、違例扣分機制，並整合至現有的登入選項與管理後台。

## What Changes

- 登入畫面新增「比賽項目」選擇 Card（雙人演武 / 創意演武），依選擇進入對應流程
- 新增「創意演武」完整評分流程：技術分與表演分**分開獨立評分**，各 0–9.5 分（0.5 分間隔）；5 位裁判分別對技術分與表演分各自去最高最低取中3位加總，再合計為大總分（最高 57 分）
- 評分 UI：整數位用 9 宮格點選，小數位用獨立切換按鈕（.0 / .5）
- 新增計時功能：賽序裁判一鍵開始/停止計時，觀眾畫面即時顯示
- 新增違例扣分機制（超時 -1、未達時間 -1、超 2 項道具 -1、未達攻擊次數 -0.5）由賽序裁判標記
- 新增分組排名顯示（男子組/女子組/混合組）
- 管理員後台支援創意演武隊伍匯入、成績查看、PDF/Excel 匯出

## Capabilities

### New Capabilities

- `creative-embu-scoring`: 創意演武評分邏輯（技術分＋表演分、0.5分間隔、去高低取中3位加總）
- `creative-embu-timer`: 計時模組（賽序裁判控制開始/停止，觀眾畫面即時顯示倒計時與實際秒數）
- `creative-embu-penalty`: 違例扣分機制（超時/未達時間/道具超量/攻擊次數不足）
- `creative-embu-flow`: 創意演武賽事流程控制（選組、開放評分、確認收分後顯示結果）
- `competition-type-selection`: 登入入口新增比賽項目選擇（Card UI），路由依類型分流

### Modified Capabilities

- `login-flow`: 登入畫面新增比賽項目選擇步驟，影響路由與 JWT payload（需攜帶 competitionType）
- `admin-dashboard`: 管理員後台需支援創意演武事件的建立、隊伍匯入、成績匯出

## Impact

- **新增 API 端點**：`POST /flow/creative/start-timer`、`POST /flow/creative/stop-timer`、`POST /flow/creative/penalties`、`POST /creative-scores`、`GET /events/:id/creative-rankings`
- **新增 Mongoose Models**：`CreativeScore`（技術分＋表演分）、`CreativePenalty`（違例紀錄）、`CreativeTimer`（計時狀態）
- **新增 Socket.IO 事件**：`timer:started`、`timer:stopped`、`creative-score:submitted`、`creative-score:calculated`、`penalty:updated`
- **新增前端頁面**：創意演武版計分裁判介面、賽序裁判介面、觀眾顯示頁
- **修改前端頁面**：`login` 頁面新增比賽項目選擇 Card、`admin` 頁面新增創意演武管理入口
- **影響檔案**：
  - `frontend/src/app/features/login/`
  - `frontend/src/app/features/admin/`
  - `frontend/src/app/app.routes.ts`
  - `backend/src/models/` (新增 3 個 Model)
  - `backend/src/controllers/` (新增 creativeScore, creativeFlow controller)
  - `backend/src/routes/` (新增對應路由)
  - `backend/src/sockets/` (新增計時廣播)
