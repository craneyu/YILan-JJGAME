## 1. 後端：隊伍完賽狀態標記

- [x] 1.1 修改 `backend/src/controllers/teamController.ts` 中的隊伍查詢邏輯，整合「完賽狀態判斷邏輯」設計決策，檢查創意演武隊伍是否已存在結算成績。
- [x] 1.2 實作「Team list includes completion status」需求，在回傳的隊伍物件中加入 `isFinished`、`finalScore` 等欄位。

## 2. 前端：隊伍清單標記與成績顯示

- [x] 2.1 修改 `frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html`，根據「隊伍清單標記樣式」設計決策，為已完賽隊伍加上視覺標籤。
- [x] 2.2 實作「Read-only score view for finished teams」需求，在 `CreativeSequenceJudgeComponent` 範本中新增成績檢視面板。
- [x] 2.3 修改 `creative-sequence-judge.component.ts` 的 `selectTeam` 邏輯，確保在選取已完賽隊伍時正確切換至「成績檢視模式」。
- [x] 2.4 執行「右方控制區：成績檢視模式」設計決策，確保當 `isFinished` 為真時，隱藏計時與評分控制按鈕。

## 3. 測試與驗證

- [x] 3.1 驗證在「成績檢視模式」下，計時器與評分按鈕確實被鎖定且不可操作。
- [x] 3.2 確認隊伍完賽後，賽序裁判重新載入頁面仍能看到「已完賽」標籤與正確成績。
