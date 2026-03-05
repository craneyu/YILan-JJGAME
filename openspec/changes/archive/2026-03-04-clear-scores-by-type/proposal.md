## Why

管理員目前只能一次清除所有成績（雙人演武 + 創意演武），無法針對單一競賽項目清除，造成誤操作風險，且在測試或賽事修正時缺乏彈性。

## What Changes

- 管理員可選擇「僅清除雙人演武成績」、「僅清除創意演武成績」、或「清除全部成績」
- 清除前顯示確認對話框，說明將清除的範圍
- 後端 `DELETE /events/:id/scores` 接受可選的 `type` 查詢參數（`Duo` | `Show`），無參數則清除全部
- 前端管理員介面的清除成績按鈕拆分為三個操作入口

## Capabilities

### New Capabilities

- `selective-score-clearing`: 依競賽項目（Duo / Show / 全部）選擇性清除成績

### Modified Capabilities

- `admin-dashboard`: 清除成績 UI 加入分項清除入口，後端 API 接受 type 參數

## Impact

- Affected specs: `selective-score-clearing`（新建）、`admin-dashboard`（修改）
- Affected code:
  - `backend/src/controllers/eventController.ts`（clearEventScores 加入 type 篩選）
  - `frontend/src/app/features/admin/admin.component.ts`（新增分項清除方法）
  - `frontend/src/app/features/admin/admin.component.html`（清除按鈕 UI 拆分）
