## 1. 後端資料模型 - Event 模型改用 competitionTypes 陣列

- [x] 1.1 修改 `backend/src/models/Event.ts`：將 `competitionType: 'kata' | 'creative'` 替換為 `competitionTypes: ('Duo' | 'Show')[]`，`default: ['Duo']`，並更新 IEvent 介面定義
- [x] 1.2 修改 `backend/src/controllers/eventController.ts`：建立賽事時讀取 `competitionTypes` 陣列，根據陣列內容分別初始化 `/game_states`（若含 Duo）與 `/creative_game_states`（若含 Show），維持 game_states 與 creative_game_states 維持各自獨立的設計決策
- [x] 1.3 建立 migration script `backend/src/seeds/migrateEventTypes.ts`：將舊有 `competitionType: 'kata'` 文件轉為 `competitionTypes: ['Duo']`、`competitionType: 'creative'` 轉為 `competitionTypes: ['Show']`

## 2. 後端資料模型 - Team 新增 competitionType 欄位

- [x] 2.1 修改 `backend/src/models/Team.ts`（或相關 Mongoose Schema）：新增 `competitionType: 'Duo' | 'Show'` 欄位，`default: 'Duo'`，並更新 ITeam 介面
- [x] 2.2 修改 `POST /events/:id/teams/import` 的後端 controller：接受請求 body 或 query 中的 `competitionType` 參數，並將其套用至所有匯入的隊伍，支援「Admin can import teams for a specific competition type within an event」需求

## 3. 後端 API - 賽事查詢與建立更新

- [x] 3.1 修改 `GET /events` 端點（`backend/src/routes/events.ts` 及 controller）：回應中包含 `competitionTypes` 陣列，移除舊 `competitionType` 單值欄位
- [x] 3.2 修改 `POST /events` 端點：接受 `competitionTypes: string[]` 陣列作為建立參數，驗證至少包含一個合法值（'Duo' 或 'Show'）
- [x] 3.3 修改 `GET /events/:id/rankings` 端點：接受可選 `competitionType` query 參數過濾回傳的排名資料，區分 Duo（kata 算法）與 Show（creative 算法）排名

## 4. 前端登入頁 - competition type selection 動態化

- [x] 4.1 修改 `frontend/src/app/features/login/login.component.ts`：於頁面載入時呼叫 `GET /api/v1/events?status=active`，取得 `competitionTypes` 陣列；若只有一個類型則自動預選並隱藏選擇 UI，支援「Login page presents competition type selection based on event's available types」需求
- [x] 4.2 修改 `frontend/src/app/features/login/login.component.html`：競賽類型卡片改為 `@for` 動態渲染，依 `availableTypes` Signal 決定顯示哪些選項
- [x] 4.3 確認 `frontend/src/app/core/services/auth.service.ts` 中 `competitionType` 儲存邏輯不變（`'kata'` / `'creative'` 存 localStorage），「Selected competition type persists after login」行為維持相同

## 5. 前端管理員頁 - 賽事建立表單更新

- [x] 5.1 修改 `frontend/src/app/features/admin/admin.component.html`：賽事建立 Dialog 表單新增「啟用項目」多選 checkbox 群組（雙人演武、創意演武），至少選一
- [x] 5.2 修改 `frontend/src/app/features/admin/admin.component.ts`：表單 Signal 加入 `competitionTypes: signal<string[]>(['Duo'])`，送出時帶入陣列，實現「Admin can create and manage creative embu events」的統一賽事建立行為

## 6. 前端管理員頁 - 賽事卡片同時顯示雙軌內容

- [x] 6.1 修改 `admin.component.html`：賽事卡片根據事件的 `competitionTypes` 使用 `@if` 渲染「雙人演武」區塊（含 Duo 隊伍列表、排名、匯出按鈕）與「創意演武」區塊（含 Show 隊伍列表、排名、匯出按鈕），實現「Admin can view creative embu rankings」的統一介面展示
- [x] 6.2 修改 `admin.component.ts`：隊伍列表 computed Signal 依 `competitionType` 欄位分群，`duoTeams` 取 `competitionType === 'Duo'` 的隊伍，`showTeams` 取 `competitionType === 'Show'` 的隊伍
- [x] 6.3 修改「匯入隊伍」功能（admin 隊伍匯入：分軌操作而非 CSV 新增欄位）：Admin 區塊各自提供獨立的匯入按鈕，呼叫 `POST /events/:id/teams/import` 時帶上 `competitionType: 'Duo'` 或 `'Show'`，實現「Admin can import teams for creative events」的分軌匯入行為

## 7. 路由驗證

- [x] 7.1 確認 `frontend/src/app/app.routes.ts` 與 `auth.service.ts` 的 Router directs users based on competition type 邏輯維持不變：`competitionType: 'kata'` 導向 `/judge/scoring`，`competitionType: 'creative'` 導向 `/creative/judge/scoring`

## 8. 驗收

- [x] 8.1 執行 `cd frontend && npm run build`，確認 Initial bundle 未超過 500kB 警告門檻
- [x] 8.2 手動測試：建立支援雙軌的賽事，分別匯入 Duo 與 Show 隊伍，確認兩個區塊各自顯示正確隊伍
- [x] 8.3 手動測試：登入頁載入單軌賽事時自動跳過類型選擇（登入頁競賽類型選擇改為事件感知）；載入雙軌賽事時顯示兩個選項卡片
