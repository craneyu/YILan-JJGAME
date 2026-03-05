## 1. 後端：`type` 查詢參數篩選

- [x] 1.1 修改 `backend/src/controllers/eventController.ts` 的 `clearEventScores` 函式，加入「後端 API：`type` 查詢參數篩選」 設計決策的實作，支援 `?type=Duo|Show` 或無參數清除全部；加入無效 type  或 type 不在 competitionTypes 時的 HTTP 400 回應（對應「Admin can selectively clear scores by competition type」需求）

## 2. 前端：管理員介面分項清除按鈕

- [x] 2.1 修改 `frontend/src/app/features/admin/admin.component.ts`，新增 `clearScoresByType(type?: 'Duo' | 'Show')` 方法，根據 type 顯示不同的 SweetAlert2 確認對話框說明文字，並帶 type 查詢參數呼叫 DELETE API（對應「前端 UI：三個獨立按鈕」設計決策 及「Admin can selectively clear scores per competition type from the dashboard」需求）
- [x] 2.2 修改 `frontend/src/app/features/admin/admin.component.html`，將原本的單一清除成績按鈕拆分為三個按鈕（清除雙人演武、清除創意演武、清除全部），依賽事的 competitionTypes 動態顯示（對應「Admin can selectively clear scores per competition type from the dashboard」需求 及「確認對話框訊息」設計決策）
