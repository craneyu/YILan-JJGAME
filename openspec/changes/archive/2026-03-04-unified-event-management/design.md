## Context

目前 `Event` 模型含有 `competitionType: 'Duo' | 'Show'` 單值欄位，每次比賽同時辦雙人演武與創意演武時，主辦方必須建立兩個獨立賽事，導致管理介面重複操作、裁判帳號需分別設定 `eventId`、排程控制無法整合在同一畫面。

現有資料模型關係：
- `Event.competitionType` 決定事件類型，影響 Admin 的顯示分組、登入頁面的路由方向、隊伍匯入的處理邏輯
- `Team` 無 `competitionType` 欄位（假設一個事件只有一個類型）
- `game_states`（kata 用）與 `creative_game_states`（creative 用）各自獨立，有自己的索引 `{ eventId: 1 }(unique)`

## Goals / Non-Goals

**Goals:**

- 一個賽事可同時包含「雙人演武」與「創意演武」兩個項目軌道
- 管理員在單一賽事卡片中管理兩軌的隊伍、分數、排名與匯出
- 登入頁競賽類型選擇根據賽事的啟用項目動態顯示
- 不破壞現有 game_state 架構（兩軌獨立運行）

**Non-Goals:**

- 不修改計分演算法或裁判評分界面的核心邏輯
- 不新增「隊伍同時參加雙人演武與創意演武」的需求
- 不將兩軌的比賽流程合併到同一個 game_state
- 不支援三個以上的競賽類型

## Decisions

### Event 模型改用 competitionTypes 陣列

**問題**：單值 `competitionType` 無法表達「同時支援兩種類型」。

**選擇**：
- Option A：`competitionTypes: ('Duo' | 'Show')[]`，預設 `['Duo']`
- Option B：`hasDuo: boolean, hasShow: boolean`，語義更清楚但難擴充

**決定**：採用 Option A（陣列）。向後相容：既有資料無 `competitionTypes` 時，後端讀取時 fallback 為 `['Duo']`（Mongoose `default` 設定處理）。舊資料若有 `competitionType: 'creative'` 的文件，需 migration script 轉換為 `competitionTypes: ['Show']`。

### Team 新增 competitionType 欄位

**問題**：若同一事件有雙軌，必須知道每支隊伍屬於哪個軌道。

**決定**：`Team` 新增 `competitionType: 'Duo' | 'Show'`，預設 `'Duo'`。既有隊伍資料 `competitionType` 欄位缺失時，後端 fallback 視為 `'Duo'`。

### Admin 隊伍匯入：分軌操作而非 CSV 新增欄位

**問題**：CSV 格式若加 `competitionType` 欄位，現有匯入檔案全部要重製。

**決定**：Admin UI 在賽事卡片的「雙人演武」與「創意演武」區塊各自提供匯入按鈕，匯入時後端自動帶入對應的 `competitionType`，CSV 格式維持原有四欄不變。

### 登入頁競賽類型選擇改為事件感知

**問題**：目前在登入前就讓使用者選類型，但選的是「哪種賽事」而非「哪個賽事裡的哪個軌道」，語意模糊。

**決定**：
1. 登入流程不改變順序（仍在登入前選類型），但「可用選項」根據使用者帳號綁定的賽事動態載入
2. 實作上：前端呼叫新增的 `GET /events/active` 或利用現有機制，取得當前賽事的 `competitionTypes` 陣列，動態渲染可選卡片
3. 若賽事只有一種類型，直接預選並隱藏選擇畫面（不打擾使用者）
4. localStorage 仍沿用 `competitionType: 'kata' | 'creative'` 儲存結果

實作輕量方案：前端打 `GET /api/v1/events?status=active`（已存在的公開端點），取第一個 active 事件的 `competitionTypes`，用此陣列過濾要顯示的選項卡片。

### game_states 與 creative_game_states 維持各自獨立

**問題**：是否需要統一成一個 `game_states` collection 加 `competitionType` 欄位？

**決定**：維持現狀，不合併。兩軌比賽流程與資料結構差異較大，合併增加複雜度且本次需求不要求流程整合。Unique Index `{ eventId: 1 }` 在各自 collection 仍有效。

## Risks / Trade-offs

- **舊資料相容性**：`competitionType: 'creative'` 的舊 Event 文件需 migration 轉為 `competitionTypes: ['creative']`。若未執行 migration，後端 fallback 邏輯為 `['kata']`，舊創意演武事件會顯示錯誤 → Mitigation：提供一次性 migration script，啟動時自動執行或手動執行
- **隊伍 competitionType 缺失**：舊 Team 資料無 `competitionType` 欄位 → Mitigation：Mongoose Schema `default: 'kata'`，所有舊資料自動 fallback
- **Admin UI 複雜度增加**：單一賽事卡片需同時顯示兩軌資訊，HTML 會變長 → 可拆分為 tab 或 accordion 元件降低視覺負擔

## Migration Plan

1. 後端 `Event` Schema：`competitionTypes` 欄位加 `default: ['Duo']`
2. 後端 `Team` Schema：`competitionType` 欄位加 `default: 'Duo'`
3. 提供 migration script（`backend/src/seeds/migrateEventTypes.ts`）：將舊 `competitionType: 'kata'` 文件更新為 `competitionTypes: ['Duo']`、`competitionType: 'creative'` 更新為 `competitionTypes: ['Show']`，刪除舊欄位
4. 前端 Admin 建立賽事表單：新增 competitionTypes 勾選欄位（預設勾選「雙人演武」）
5. 前端登入頁：改為動態讀取賽事 competitionTypes，過濾顯示卡片

## Open Questions

- 若一場比賽同時進行雙人演武與創意演武，裁判帳號分配是否需要「同一帳號可兩軌切換」？目前假設裁判只擔任一軌的工作。
