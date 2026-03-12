## 1. 後端：批次重置 API

- [x] 1.1 在 `matchScoreController.ts` 新增 `resetMatchScoresBulk` controller：依設計決策「完全重置（Complete Reset）」，接受 `matchIds: string[]`，驗證非空，對每個 matchId 執行成績欄位歸零（所有計分欄位設為 0）、刪除 MatchScoreLog、設 `status: "pending"`、清除 `result`，回傳 `{ success: true, resetCount: number }`（對應 admin can reset match scores in bulk via API）
- [x] 1.2 在 `matchScores.ts` 路由檔新增 `POST /match-scores/reset-bulk`，套用 `verifyToken` + `requireRole("admin")`，呼叫 `resetMatchScoresBulk`（對應 admin can reset match scores in bulk via API，以及 non-admin role is rejected 場景）
- [x] 1.3 驗證空陣列回傳 HTTP 400 `{ success: false, error: "matchIds 不可為空" }`（對應 empty matchIds array 場景）

## 2. 前端：checkbox 多選狀態

- [x] 2.1 依設計決策「UI：checkbox 多選 + 固定操作列」，在 `match-management.component.ts` 新增 `selectedMatchIds = signal<Set<string>>(new Set())`，以及 `allSelected = computed(...)` 判斷是否全選（對應 admin can select individual matches and clear their scores）
- [x] 2.2 新增 `toggleSelect(matchId: string)`、`toggleSelectAll()`、`clearSelection()` 三個方法，操作 `selectedMatchIds` Signal（對應 select all via header checkbox、deselect all 場景）

## 3. 前端：三種批次操作方法

- [x] 3.1 新增 `clearAllScores()` 方法：SweetAlert2 確認 → 收集當前 matchType 所有場次 ID → `POST /match-scores/reset-bulk` → 更新本地 matches Signal → 成功 toast 顯示重置筆數（對應 admin can clear all match scores for a sport type）
- [x] 3.2 新增 `clearCompletedScores()` 方法：篩選 `status === "completed"` 場次 → 若無則顯示「目前沒有已完成的場次」toast → 否則 SweetAlert2 確認 → `POST /match-scores/reset-bulk`（對應 admin can clear only completed match scores for a sport type，以及 no completed matches exist 場景）
- [x] 3.3 新增 `clearSelectedScores()` 方法：取 `selectedMatchIds` → SweetAlert2 確認（顯示選取數量）→ `POST /match-scores/reset-bulk` → 清除 `selectedMatchIds`（對應 select and clear individual matches 場景）

## 4. 前端：HTML 模板更新

- [x] 4.1 在場次列表表頭加入「全選」checkbox，綁定 `allSelected` 與 `toggleSelectAll()`（對應 select all via header checkbox）
- [x] 4.2 在每個場次列左側加入 checkbox，綁定 `selectedMatchIds` 與 `toggleSelect(match._id)`（對應 admin can select individual matches）
- [x] 4.3 在操作列新增「清除全部成績」按鈕（.glass-btn + 紅色邊框樣式）和「清除已完成成績」按鈕，分別呼叫 `clearAllScores()` 和 `clearCompletedScores()`（對應 admin can clear all match scores for a sport type、admin can clear only completed match scores）
- [x] 4.4 當 `selectedMatchIds().size > 0` 時顯示「清除所選成績（N 筆）」按鈕（使用 `@if` 條件渲染），呼叫 `clearSelectedScores()`（對應 admin can select individual matches and clear their scores，以及批次清除時 deselect 場景）

## 5. 驗收

- [x] 5.1 使用 matchIds 陣列的批次 API：測試三種情境（全部 / 已完成 / 勾選），確認各自只重置對應場次，不影響其他 matchType 場次
- [x] 5.2 完全重置驗證：確認重置後 Match 文件 `status === "pending"`、`result` 不存在、所有計分欄位為 0，且 MatchScoreLog 已刪除
- [x] 5.3 執行 `cd frontend && npm run build`，確認 Initial bundle 未超過 500kB
