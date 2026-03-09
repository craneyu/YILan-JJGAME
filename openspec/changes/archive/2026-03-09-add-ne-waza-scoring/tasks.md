# Tasks: add-ne-waza-scoring

## 1. Backend: 新資料模型：Match 與 MatchScore 獨立於演武系統

- [x] 1.1 建立 `backend/src/models/Match.ts`：定義 Match schema（matchType, category, weightClass, round, matchNo, redPlayer, bluePlayer, status, result, isBye, scheduledOrder）
- [x] 1.2 建立 `backend/src/models/MatchScoreLog.ts`：定義 MatchScoreLog schema（matchId, side, type, value, timestamp）
- [x] 1.3 在 Match model 加入 index：`{ eventId: 1, matchType: 1, scheduledOrder: 1 }`
- [x] 1.4 實作 Match status transitions follow a strict lifecycle：pending → in-progress → completed 狀態機，禁止 completed 回退（裁判端）

## 2. Backend: match_referee 角色與認證

- [x] 2.1 更新 `backend/src/models/User.ts`：在 role enum 新增 `match_referee`
- [x] 2.2 更新 `backend/src/middleware/auth.ts`：確保 `match_referee` 通過 verifyToken
- [x] 2.3 更新 `backend/src/seeds/initialUsers.ts`：新增 `match_referee` 種子帳號（username: `match1`, password: `match1`）
- [x] 2.4 驗證 match_referee role is restricted to match management endpoints（match_referee 存取 /api/v1/flow/\* 回傳 403）

## 3. Backend: Matches API

- [x] 3.1 Admin can create individual matches manually：建立 `backend/src/controllers/matchController.ts`：
  - `getMatches`（GET, 依 eventId + scheduledOrder 排序）
  - `createMatch`（POST, admin only）：Admin can create individual matches manually（POST /api/v1/matches 單筆建立）
  - `bulkCreateMatches`（POST /bulk, admin only，含重複 scheduledOrder 檢查）
  - `updateMatch`（PATCH, admin + match_referee）
- [x] 3.2 建立 `backend/src/routes/matches.ts`：定義路由並套用 requireRole
- [x] 3.3 在 `backend/src/index.ts` 掛載 `/api/v1/matches` 路由
- [x] 3.4 驗證 Admin can create matches via CSV/Excel import（/bulk endpoint 可正確建立多筆 Match，且拒絕重複 scheduledOrder）
- [x] 3.5 驗證 Match list is sorted by scheduledOrder（GET 回傳依 scheduledOrder 升序）

## 4. Backend: MatchScoreLogs API

- [x] 4.1 建立 `backend/src/controllers/matchScoreController.ts`：
  - `createScoreLog`（POST /api/v1/match-scores, match_referee only）
  - `getScoreLogs`（GET /api/v1/match-scores?matchId=, match_referee only）
- [x] 4.2 建立 `backend/src/routes/matchScores.ts`
- [x] 4.3 在 `backend/src/index.ts` 掛載 `/api/v1/match-scores` 路由

## 5. Backend: Socket.IO 房間策略：沿用 eventId 房間廣播

- [x] 5.1 在 `backend/src/sockets/index.ts` 新增 match 事件 handlers：
  - `match:score-updated`（broadcast to eventId room）
  - `match:timer-updated`（broadcast to eventId room）
  - `match:ended`（broadcast to eventId room）
- [x] 5.2 確保 match socket 事件與演武事件（`score:submitted` 等）名稱不衝突

## 6. Frontend: 型別與服務擴充

- [x] 6.1 新增 `Match` 與 `MatchScoreLog` TypeScript interface 定義（可放在 `core/models/match.model.ts`）
- [x] 6.2 更新 `frontend/src/app/core/services/socket.service.ts`：新增 `match:score-updated`, `match:timer-updated`, `match:ended` 事件 Observable
- [x] 6.3 更新 `frontend/src/app/features/login/login.component.ts`：新增 `match_referee` 角色選項（顯示名稱：「賽場裁判」）
- [x] 6.4 更新 `frontend/src/app/app.routes.ts`：新增 `/match-referee` 路由（roleGuard: match_referee）與 `/match-audience` 路由（公開，無 guard）

## 7. Frontend: match_referee 前端：單一元件兩種視圖（列表 / 計分）

- [x] 7.1 建立 `frontend/src/app/features/match-referee/match-referee.component.ts`：Standalone + OnPush，inject ApiService、SocketService、AuthService，Signal：`view`, `matches`, `activeMatch`
- [x] 7.2 實作場次列表視圖（list view）：顯示所有 matches 依 scheduledOrder，狀態 badge（待開始/進行中/已完成+鎖定）
- [x] 7.3 驗證 match_referee sees a match selection list（已完成場次顯示鎖定圖示且不可點擊）
- [x] 7.4 實作選取場次後呼叫 PATCH 更新 status 為 in-progress，切換到計分視圖

## 8. Frontend: match-referee 元件（寢技計分介面）

- [x] 8.1 實作計時器 Signals（`timerRunning`, `timerRemaining`）與 setInterval 倒數邏輯，每秒 emit `match:timer-updated`，到 00:00 自動暫停
- [x] 8.2 實作計時器快速選擇 UI（2/3/5/6分按鈕，Ne-Waza 預設 6分），以及暫停中 ▲/▼ 調整分秒 UI，[繼續比賽] / [儲存並繼續]（Timer controls are available before and during match）
- [x] 8.3 實作紅藍雙方計分區塊：[2分][3分][4分][優勢][降伏勝]按鈕 + [↩ 取消上一筆] 按鈕，各自獨立操作歷史（scoreLog Signal，referee records Ne-Waza scores per side）
- [x] 8.4 實作每次得分：呼叫 POST /api/v1/match-scores、emit match:score-updated，[降伏勝] 直接 emit match:ended
- [x] 8.5 實作 [↩ 取消上一筆]：只撤銷該方最後一筆，POST undo log，發送更新 socket
- [x] 8.6 實作警告系統（Warning system follows cumulative rules）：依設計決策「警告累計規則由前端處理，後端僅記錄」，[+警告][-警告] Signals，computed() 自動計算對方優勢，第4次警告彈確認 Dialog，[-警告] 扣回優勢確認
- [x] 8.7 實作傷停計時（Injury timeout suspends match timer）：[+傷停] 觸發 overlay，2分鐘 countdown，[繼續比賽] 恢復主計時
- [x] 8.8 實作 DQ 流程（DQ immediately ends match with confirmation）：SweetAlert2 二步確認，確認後 PATCH match result + emit match:ended
- [x] 8.9 實作 [紅方勝][藍方勝] 裁判判決按鈕（Referee confirms final match result）：確認 Dialog → PATCH match status: completed + result → view 回到列表

## 9. Frontend: match-audience 元件（公開計分板）

- [x] 9.1 建立 `frontend/src/app/features/match-audience/match-audience.component.ts`：Standalone + OnPush，無 auth guard，從 queryParam 取 eventId 加入 Socket.IO 房間（Audience display is publicly accessible without authentication）
- [x] 9.2 實作等待畫面（無進行中場次時顯示「等待下一場比賽」）（Audience display shows current match information）
- [x] 9.3 實作計分板視圖：紅藍雙方得分、優勢、隊名、選手名、計時器
- [x] 9.4 監聽 `match:score-updated` 更新得分顯示（Audience display receives socket events for real-time updates）
- [x] 9.5 監聽 `match:timer-updated` 更新計時器顯示
- [x] 9.6 監聽 `match:ended` 顯示勝方橫幅（🏆 紅方勝 / 藍方勝）
- [x] 9.7 實作全螢幕切換按鈕（Audience display supports fullscreen mode）

## 10. Admin: Admin 匯入賽程：沿用現有 XLSX 解析模式

- [x] 10.1 在 Admin 元件新增「柔術賽程匯入」區塊，提供 CSV 範本下載連結
- [x] 10.2 實作 CSV/Excel 解析（沿用現有 XLSX 模式，Admin can create matches via CSV/Excel import）
- [x] 10.3 呼叫 POST /api/v1/matches/bulk，顯示成功/失敗筆數 toast
