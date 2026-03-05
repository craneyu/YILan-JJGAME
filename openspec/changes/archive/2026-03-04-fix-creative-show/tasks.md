## 1. 後端：CreativeGameState schema 擴充計時器狀態

- [x] 1.1 在 `backend/src/models/CreativeGameState.ts` 新增 `timerStatus: 'idle' | 'running' | 'paused'`（預設 `'idle'`）欄位，以支援計時器狀態模型擴充：timerStatus 欄位

## 2. 後端：計時器 pause / resume / reset 邏輯

- [x] 2.1 在 `backend/src/controllers/creativeTimerController.ts` 新增 pause 路由處理函式（實作「Sequence judge controls the performance timer」timer paused 情境）：記錄 `timerElapsedMs` 並設 `timerStatus: 'paused'`，廣播 `timer:stopped`（含 `elapsedMs`）
- [x] 2.2 在 `backend/src/controllers/creativeTimerController.ts` 新增 resume 路由處理函式（實作「Sequence judge controls the performance timer」timer resumed 情境）：設新 `timerStartedAt = now`、保留 `timerElapsedMs`、`timerStatus: 'running'`，廣播 `timer:started`（含 `elapsedMs`）
- [x] 2.3 在 `backend/src/controllers/creativeTimerController.ts` 新增 reset 路由處理函式（實作「Sequence judge controls the performance timer」timer reset 情境）：清空 `timerStartedAt`、`timerElapsedMs = 0`、`timerStatus: 'idle'`，廣播 `timer:stopped`（`elapsedMs: 0`）
- [x] 2.4 在 `backend/src/routes/creativeFlow.ts`（或 creativeTimer 路由檔）新增 `POST /creative/timer/pause`、`POST /creative/timer/resume`、`POST /creative/timer/reset` 路由

## 3. 後端：creative:score:calculated 廣播 payload 補充（Final score calculated when all 5 judges have submitted）

- [x] 3.1 在 `backend/src/controllers/creativeScoreController.ts` 的廣播邏輯中加入 `teamId`（來自 `gameState.currentTeamId`）與 `penalties` 陣列（每項含 `type`, `deduction`, `count`），確保 creative:score:calculated 廣播 payload 補充符合「Final score calculated when all 5 judges have submitted」規格

## 4. 前端：SocketService 型別補充

- [x] 4.1 在 `frontend/src/app/core/services/socket.service.ts` 確認 `creativeScoringOpened$` 的 payload 介面包含 `members: string[]`，支援「Sequence judge opens scoring for a team」廣播 members 欄位

## 5. 前端：計時顯示修正：timestamp-based 計算（Timer display computed from timestamp, not interval increment）

- [x] 5.1 在 `frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts` 修正計時顯示，實作「Timer display computed from timestamp, not interval increment」：使用 `Date.now() - new Date(timerStartedAt).getTime() + elapsedBase` 計算（計時顯示修正：timestamp-based 計算）；`timerStartedAt` 無效時 fallback 顯示 `00:00`（無 NaN 顯示）

## 6. 前端：計時畫面 timer UX — Timer view provides pause, resume, and reset controls

- [x] 6.1 在 `creative-sequence-judge.component.ts` 新增 `timerStatus: signal<'idle'|'running'|'paused'>('idle')`、`elapsedMs: signal<number>(0)`，以及 `pauseTimer()`、`resumeTimer()`、`resetTimer()` 方法（實作「Timer view provides pause, resume, and reset controls」）
- [x] 6.2 在 `creative-sequence-judge.component.html` 依 `timerStatus` 顯示「暫停」或「繼續」按鈕，加入「歸零」按鈕；Space 鍵依狀態執行 pause 或 resume（「Timer view provides pause, resume, and reset controls」HTML 控制區）
- [x] 6.3 在 `creative-sequence-judge.component.ts` 的 `ngOnInit` 還原 `timerStatus` 與 `elapsedMs`（頁面重載後還原計時狀態，對應「Timer view provides pause, resume, and reset controls」scenario）

## 7. 前端：計時畫面顯示當前隊伍資訊 — Timer view displays current team information in real-time

- [x] 7.1 在 `creative-sequence-judge.component.ts` 新增 `currentCategory: signal<string>('')`、`currentTeamName: signal<string>('')`、`currentMembers: signal<string[]>([])`，選隊後即時更新（實作「Timer view displays current team information in real-time」）
- [x] 7.2 在 `creative-sequence-judge.component.html` 計時器區域加入組別、隊伍名稱、參賽者名稱顯示；未選隊時顯示 placeholder（「Timer view displays current team information in real-time」— placeholder 情境）

## 8. 前端：賽序裁判隊伍清單排序（Sequence judge opens scoring for a team）

- [x] 8.1 在 `creative-sequence-judge.component.ts` 新增 `sortedTeams = computed(...)` 依 category → order 排序隊伍（對應「Sequence judge opens scoring for a team」team list 排序情境），更新 HTML template 使用 `sortedTeams()`

## 9. 前端：賽序裁判計時畫面顯示計分結果 — Sequence judge timer view displays real-time calculated score

- [x] 9.1 在 `creative-sequence-judge.component.ts` 新增 `lastScoreResult` signal，訂閱 `creative:score:calculated` 並在 teamId 匹配時更新；切換隊伍時清除（實作「Sequence judge timer view displays real-time calculated score」— score display 顯示與清除）
- [x] 9.2 在 `creative-sequence-judge.component.html` 計時器下方加入分數結果面板，顯示技術分、表演分、扣分總計、最終分及 penalty 詳細項目（「Sequence judge timer view displays real-time calculated score」— penalty 詳細列出情境）

## 10. 前端：觀眾端即時更新（觀眾端與賽序裁判即時更新策略）— Audience page displays real-time score and team information

- [x] 10.1 在 `frontend/src/app/features/creative-audience/creative-audience.component.ts` 訂閱 `creative:scoring-opened` 事件更新 `currentTeamName`、`currentMembers`（實作「Audience page displays real-time score and team information」— 觀眾端與賽序裁判即時更新策略）
- [x] 10.2 在 `creative-audience.component.ts` 訂閱 `creative:score:calculated` 更新 `scoreResult` signal；在 `creative-audience.component.html` 顯示技術分、表演分、扣分、最終分（「Audience page displays real-time score and team information」— 觀眾端與賽序裁判即時更新策略）

## 11. 驗收：Build 確認

- [x] 11.1 執行 `cd frontend && npm run build`，確認 Initial bundle 未超過 500kB 警告門檻
