## Why

管理員目前唯一的清除選項是「清空全部」，這會連同選手資料與場次結構一併刪除，無法在保留賽程安排的前提下重打比賽。需要兩個更精細的操作：只清除成績（保留選手/場次）、以及只清除已完成場次的成績，讓誤判或場地異常時可快速重賽。

## What Changes

- 在各運動類型（對打/寢技/格鬥）的場次管理頁新增兩個按鈕：
  - **清除全部成績**：將該 matchType 下所有場次的計分歸零，status 重設為 `pending`，result 清除
  - **清除已完成成績**：同上，但只作用於 `status === "completed"` 的場次
- 場次列表加入 checkbox 多選，支援勾選個別場次後批次清除成績
- 三種運動各自獨立操作，操作只影響當下所在的 matchType
- 新增後端批次重置 API：`POST /api/v1/match-scores/reset-bulk`，接受 matchIds 陣列
- 重置動作為「完全重置」：計分欄位歸零 + MatchScoreLog 刪除 + status → `pending` + result 清除
- 權限：admin 限定（同現有「清空全部」）

## Capabilities

### New Capabilities

- `bulk-match-score-reset`: 管理員可在各運動管理頁面，針對個別或批次場次執行成績重置（完全重置至 pending），操作範圍限定於當前 matchType，不影響其他運動類型的資料

### Modified Capabilities

（none）

## Impact

- Affected specs: `bulk-match-score-reset`（新建）
- Affected code:
  - `backend/src/controllers/matchScoreController.ts` — 新增 `resetMatchScoresBulk` controller
  - `backend/src/routes/matchScores.ts` — 新增 `POST /match-scores/reset-bulk` 路由
  - `frontend/src/app/features/admin/match-management/match-management.component.ts` — 新增 checkbox 多選狀態、clearAllScores()、clearCompletedScores()、clearSelectedScores() 方法
  - `frontend/src/app/features/admin/match-management/match-management.component.html` — 新增操作按鈕列與場次列表 checkbox
