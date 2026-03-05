## 1. 後端資料模型與 API

- [x] 1.1 在 `CreativeGameState` Mongoose schema 新增 `isAbstained: Boolean`（預設 false），實作「CreativeGameState stores abstain flag」需求（棄權狀態儲存於 CreativeGameState 決策）
- [x] 1.2 在 `backend/src/routes/creativeFlow.ts` 新增 `POST /abstain` 與 `POST /abstain-cancel` 兩條路由，允許角色 `sequence_judge`、`admin`，實作「棄權 API 獨立於 /creative/flow 路由」決策
- [x] 1.3 在 `backend/src/controllers/creativeFlowController.ts` 實作 `abstainTeam` controller：更新 `CreativeGameState.isAbstained = true`，廣播 `creative:team-abstained` Socket.IO 事件，實作「Sequence judge can mark current team as abstained」需求
- [x] 1.4 在 `backend/src/controllers/creativeFlowController.ts` 實作 `cancelAbstain` controller：更新 `CreativeGameState.isAbstained = false`，廣播 `creative:team-abstain-cancelled` Socket.IO 事件
- [x] 1.5 在 `getCreativeState` 回傳資料中加入 `isAbstained: boolean`，實作「getCreativeState 回傳 isAbstained」決策
- [x] 1.6 在 `nextTeam` controller 的 upsert 操作中加入 `isAbstained: false` 重置，防止棄權狀態繼承到下一組

## 2. 前端 Socket 服務

- [x] 2.1 在 `frontend/src/app/core/services/socket.service.ts` 新增 `creativeTeamAbstained$` 與 `creativeTeamAbstainCancelled$` Observable，實作「Socket.IO 事件命名」決策

## 3. 賽序裁判棄權 UI

- [x] 3.1 在 `creative-sequence-judge.component.ts` 新增 `isAbstained` signal、`abstainTeam()` 與 `cancelAbstain()` 方法，訂閱 `creativeTeamAbstained$` 與 `creativeTeamAbstainCancelled$`
- [x] 3.2 在 `creative-sequence-judge.component.ts` 於 `loadState()` 中讀取並設定 `isAbstained` 初始值
- [x] 3.3 在 `creative-sequence-judge.component.html` 新增「設定此組棄權」/「取消棄權」按鈕，當 `timerStatus === 'running'` 或 `scoringOpen === true` 時禁用，實作「Sequence judge can mark current team as abstained」需求
- [x] 3.4 確認 `nextTeam` 呼叫後在前端重置 `isAbstained` signal 為 false，實作「Abstain status resets on team change」場景

## 4. 計分裁判棄權同步

- [x] 4.1 在 `creative-scoring-judge.component.ts` 訂閱 `creativeTeamAbstained$`，設定 abstain 旗標並禁用送出按鈕，實作「Scoring judge receives abstain notification」需求
- [x] 4.2 在 `creative-scoring-judge.component.ts` 訂閱 `creativeTeamAbstainCancelled$`，恢復正常評分狀態，實作「Scoring judge state resets on abstain-cancelled」場景
- [x] 4.3 在 `creative-scoring-judge.component.html` 顯示棄權通知提示與禁用送出按鈕，實作「Scoring judge sees abstain state」場景

## 5. 觀眾畫面棄權顯示

- [x] 5.1 在 `creative-audience.component.ts` 訂閱 `creativeTeamAbstained$`，設定 `isAbstained` 旗標，實作「Audience display shows abstain status」需求
- [x] 5.2 在 `creative-audience.component.ts` 訂閱 `creativeTeamAbstainCancelled$`，移除棄權標記
- [x] 5.3 在 `creative-audience.component.html` 在隊伍名稱旁顯示「棄權」badge，實作「Audience sees abstain label」與「Audience abstain label removed on cancel」場景

## 6. Admin 匯出扣分原因

- [x] 6.1 在 `admin.component.ts` 的 Excel 匯出邏輯中，查詢 `CreativePenalty` 資料並組合「扣分原因」欄位文字（格式：「超時 -1.0、使用道具 -1.0」），實作「Admin can export creative embu results」修改需求與「Excel export includes deduction reasons for penalized teams」場景（匯出扣分原因：在現有 penalty 欄位旁加附註欄）
- [x] 6.2 在 Excel 匯出的每個 category sheet 中新增「扣分原因」欄，當 `penaltyDeduction === 0` 時該欄留空，實作「Excel export shows empty deduction reason for clean teams」場景
- [x] 6.3 在 `admin.component.ts` 的 PDF 匯出邏輯中，對 `penaltyDeduction > 0` 的隊伍，在扣分數字後附加括號原因（格式：`-2.0 (超時, 使用道具)`），實作「PDF export shows deduction reason inline」場景
- [x] 6.4 在 Excel 與 PDF 匯出中，對 `isAbstained === true` 的隊伍，rank 欄顯示「棄權」、所有得分欄顯示「—」，實作「Abstained teams appear in export with special notation」場景

## 7. 驗證與建置

- [x] 7.1 執行 `cd frontend && npm run build` 確認 Initial bundle 未超過 500kB，無 TypeScript 編譯錯誤
