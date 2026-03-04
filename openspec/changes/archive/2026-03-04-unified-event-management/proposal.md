## Why

目前系統將「雙人演武」與「創意演武」設計為兩個獨立賽事（`competitionType: ‘Duo' | ’Show'`），導致主辦單位必須建立兩個賽事才能辦一場同時包含兩種項目的比賽，管理困難且數據分散。需要讓一個賽事可以同時涵蓋兩種競賽項目。

## What Changes

- `Event.competitionType` 從單值 `'Duo' | ’Show'` 改為陣列 `competitionTypes: ('Duo' | 'Show')[]`
- `Team` 新增 `competitionType: 'Duo' | 'Show'` 欄位，標示該隊屬於哪個項目
- 管理員建立賽事時可勾選要啟用的項目（雙人演武、創意演武，可複選）
- 管理員頁面中，單一賽事卡片同時顯示雙人演武與創意演武兩個區塊（各自有隊伍、分數、排名）
- 登入頁「競賽類型選擇」改為在「已登入的賽事」中選擇要操作的項目軌道，而非事前選擇不同賽事
- 隊伍匯入 CSV 新增 `competitionType` 欄位（`Duo ` 或 `Show`），或透過分頁/分區匯入

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `admin-dashboard`: 賽事建立表單新增「啟用項目」多選欄位；單一賽事卡片同時管理雙人演武與創意演武隊伍、分數、排名、匯出
- `competition-type-selection`: 競賽類型選擇時機從「登入前」改為「登入後從 JWT eventId 對應的賽事中選擇可用項目」；選擇邏輯根據賽事啟用的 `competitionTypes` 動態呈現可用選項

## Impact

- Affected specs: `admin-dashboard`, `competition-type-selection`
- Affected code:
  - `backend/src/models/Event.ts` — `competitionType` → `competitionTypes: string[]`
  - `backend/src/models/Team.ts` (若存在) 或相關 Schema — 新增 `competitionType` 欄位
  - `backend/src/controllers/eventController.ts` — 建立/更新賽事邏輯
  - `backend/src/routes/events.ts` — 可能新增查詢參數過濾
  - `frontend/src/app/features/admin/admin.component.ts` — 賽事建立表單、賽事卡片同時顯示兩個區塊
  - `frontend/src/app/features/admin/admin.component.html` — 賽事 UI 調整
  - `frontend/src/app/features/login/login.component.ts` — 競賽類型選擇邏輯調整
  - `frontend/src/app/features/login/login.component.html` — 選擇時機與動態選項
  - `frontend/src/app/core/services/auth.service.ts` — 處理 competitionType 儲存邏輯
