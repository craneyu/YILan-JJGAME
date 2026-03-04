# Tasks: add-creative-embu

## 1. 後端資料模型

- [x] 1.1 在 `/events` Model 新增 `competitionType: 'kata' | 'creative'` 欄位，以 competitionType 欄位區分 Event 類型，為現有 kata 資料補上 fallback `'kata'`
- [x] 1.2 建立 `CreativeScore` Mongoose Model（ICreativeScore interface + unique index），實作 judge submits technical and artistic scores；此為創意演武獨立 score collection，不修改現有 /scores
- [x] 1.3 建立 `CreativePenalty` Mongoose Model（ICreativePenalty interface + unique index），支援 penalties affect final score calculation；此為違例扣分 collection，unique index: { eventId, teamId, penaltyType }
- [x] 1.4 建立 `CreativeGameState` Mongoose Model（ICreativeGameState interface + unique index），實作 creative event state management；計時狀態放入 creative_game_states（timerStartedAt/timerStoppedAt/timerElapsedMs）

## 2. 後端計分演算法與工具函式

- [x] 2.1 在 `backend/src/utils/` 新增 `creativeScoring.ts`，實作 final score calculated when all 5 judges have submitted（技術分與表演分**分別**去最高最低分取中間3位加總，technicalTotal + artisticTotal = grandTotal，最高 57 分（3×9.5×2），penalties cannot produce negative final score）

## 3. 後端 Controller 與路由

- [x] 3.1 建立 `creativeScoreController.ts`：POST `/api/v1/creative-scores`（judge submits technical and artistic scores；驗證 0 ≤ score ≤ 9.5 且為 0.5 的倍數；重複提交回 409，invalid score value rejected 回 400）
- [x] 3.2 建立 `creativeFlowController.ts`：sequence judge opens scoring for a team（POST `/api/v1/creative/flow/open-scoring`），更新 CreativeGameState
- [x] 3.3 在 `creativeFlowController.ts` 新增：sequence judge confirms score collection and ends the round（POST `/api/v1/creative/flow/confirm-scores`，confirm blocked if not all judges submitted）
- [x] 3.4 在 `creativeFlowController.ts` 新增：sequence judge advances to the next team（POST `/api/v1/creative/flow/next-team`，state reset on next team）
- [x] 3.5 建立 `creativeTimerController.ts`：POST `/api/v1/creative/flow/start-timer`（timer started）、POST `/api/v1/creative/flow/stop-timer`（timer stopped）
- [x] 3.6 建立 `creativePenaltyController.ts`：POST `/api/v1/creative/penalties`（marks violation penalties、penalty removed 邏輯）
- [x] 3.7 建立 `creativeRankingsController.ts`：GET `/api/v1/events/:id/creative-rankings`（admin can view creative embu rankings，依 finalScore 降序分組排名）
- [x] 3.8 在 Event 建立端點新增：當 `competitionType: 'creative'` 時建立對應的 CreativeGameState 文件（state document created with event）
- [x] 3.9 將所有新 controller 掛載至對應 Express Router，設定角色守衛（scoring_judge, sequence_judge, admin, audience）

## 4. 後端 Socket.IO 廣播

- [x] 4.1 在 `backend/src/sockets/` 新增創意演武 broadcast 物件，廣播 `creative:scoring-opened`、`creative-score:submitted`、`creative-score:calculated`（含 technicalTotal/artisticTotal/grandTotal/penaltyDeduction/finalScore）
- [x] 4.2 在 timer controller 廣播 `timer:started`（含 startedAt）與 `timer:stopped`（含 elapsedMs）

## 5. 前端路由與登入流程

- [x] 5.1 修改 `login` 頁面元件：login page presents competition type selection（Card UI）；同時實作 login page requires competition type selection before credential entry（login form hidden before selection）
- [x] 5.2 實作 selected competition type persists after login：登入成功後將 `competitionType` 寫入 localStorage
- [x] 5.3 在 `app.routes.ts` 新增 `/creative/*` 路由群組，實作前端路由分流設計（router directs users based on competition type；scoring judge redirected to correct page after creative login）
- [x] 5.4 更新 `AuthService` 讀取並提供 `competitionType` signal，供路由守衛判斷

## 6. 前端創意演武計分裁判頁

- [x] 6.1 建立 `creative-scoring-judge` Standalone OnPush 元件（`frontend/src/app/features/creative-scoring-judge/`），實作 scoring state transitions for judges（等待→評分→已送出三態）
- [x] 6.2 實作技術分與表演分輸入 UI（score input UI uses 9-grid integer selector and decimal toggle；依評分按鈕：9 宮格整數＋小數切換設計）：整數宮格 3×3（1–9 + 0），使用 `.score-btn-selected` / `.score-btn-unselected`；小數切換按鈕顯示 `.0` / `.5`，點擊交替切換；小數預設 `.0` 且不因重選整數而重置
- [x] 6.3 實作 judge cannot submit partial scores（「確認送出」按鈕 `.disabled-btn` 直到兩項皆有值）
- [x] 6.4 訂閱 `creative:scoring-opened` Socket.IO 事件觸發狀態轉換，呼叫 POST `/api/v1/creative-scores` 送出後進入已送出狀態

## 7. 前端創意演武賽序裁判頁

- [x] 7.1 建立 `creative-sequence-judge` Standalone OnPush 元件，包含隊伍選擇區、計時器控制按鈕
- [x] 7.2 實作 sequence judge controls the performance timer：單一按鈕切換開始/停止，space key toggles timer（鍵盤 Space 綁定）
- [x] 7.3 實作 valid performance time range 視覺提示：停止時顯示綠色（合規）/黃色（未達時間）/紅色（超時）指示器，highlighted as applicable 對應違例選項
- [x] 7.4 實作 sequence judge marks violation penalties（4 種違例 checkbox/toggle，允許複選，deselect 可移除）
- [x] 7.5 實作「開放評分」按鈕（sequence judge opens scoring for a team）與「確認收分」按鈕（sequence judge confirms score collection，confirm blocked if not all judges submitted 顯示提示）
- [x] 7.6 實作「下一組」按鈕（sequence judge advances to the next team）並清除計時器與違例狀態

## 8. 前端創意演武觀眾顯示頁

- [x] 8.1 建立 `creative-audience` Standalone OnPush 元件，訂閱計時器事件，實作 audience display shows live timer（MM:SS 格式每秒更新）
- [x] 8.2 訂閱 `timer:stopped` 事件，timer stops and final time shown
- [x] 8.3 訂閱 `penalty:updated` 事件，實作 penalties visible on audience display（penalty displayed to audience：違例類型標籤 + 總扣分）
- [x] 8.4 訂閱 `creative-score:calculated` 事件，顯示技術總分、表演總分、大總分、最終得分，以及分組排名

## 9. 前端管理員後台（創意演武）

- [x] 9.1 修改管理員事件建立表單，新增 `competitionType` 選擇（kata/creative），實作 admin can create and manage creative embu events
- [x] 9.2 事件列表依 `competitionType` 分組或篩選顯示，admin can view creative events separately
- [x] 9.3 實作創意演武隊伍匯入（team import for creative event，使用既有 CSV/Excel 格式，重複檢查邏輯），admin can import teams for creative events
- [x] 9.4 實作創意演武排名顯示頁（admin can view creative embu rankings，按 finalScore 降序，分 male/female/mixed 組別）
- [x] 9.5 實作 admin can export creative embu results — Excel 格式（admin exports Excel for creative event，含 technicalTotal/artisticTotal/grandTotal/penaltyDeduction/finalScore）
- [x] 9.6 實作 admin can export creative embu results — PDF 格式（admin exports PDF for creative event，A4 橫向，裁判長簽名欄）

## 10. 驗收與建置

- [x] 10.1 執行 `cd frontend && npm run build`，確認 Initial bundle 未超過 500kB 警告門檻
