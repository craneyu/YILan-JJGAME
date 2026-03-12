## 1. 後端資料模型擴充

- [x] 1.1 擴充 `Match` 模型（Match model stores PART scores, WAZA-ARI counts, and SHIDO counts；CHUI count stored in Match model；SHIDO count stored in Match model）：新增 `redPart1Score`~`redPart3Score`、`bluePart1Score`~`bluePart3Score`、`redIppons`、`blueIppons`；新增 `redWazaAri`、`blueWazaAri`；新增 `redShido`、`blueShido`（CHUI 計數存入 Match 模型，折算 SHIDO×3）；新增 Match duration stored in Match model 所需的 `matchDuration`（default: 180）；擴充 status 含 `full-ippon-pending`、`shido-dq-pending`；定義 TypeScript 介面 `IMatch`
- [x] 1.2 擴充 `MatchScoreLog` 模型：新增 MatchScoreLog stores PART index and IPPON snapshot 所需欄位（`partIndex: 1|2|3|null`、`ipponsSnapshot: {p1,p2,p3}`、`actionType: string`）；定義 TypeScript 介面 `IMatchScoreLog`

## 2. 後端 Controller 與路由

- [x] 2.1 實作 PART sectional score buttons（PART 分區計分存入 MatchScoreLog）：Controller 處理 PART 分區計分，接收 `partIndex` 與 `delta`，更新 PART 分數、WAZA-ARI 計數、IPPON 快照，寫入 `MatchScoreLog`（log entry created on PART scoring）
- [x] 2.2 實作 PART score and IPPON snapshot stored in log：ALL PARTS +1/-1 以 `partIndex: null` 寫入 log entry for ALL PARTS action；Score deduction validates non-negative result（WAZA-ARI recalculated on valid score reduction）：任何減分操作前驗證結果 ≥ 0，否則回傳 HTTP 400（PART score decrement blocked at zero、Total score decrement blocked at zero）
- [x] 2.3 實作 FULL IPPON detection on backend（FULL IPPON 判定於後端 Controller）：Controller 在每次 PART 計分後檢查 IPPON 快照，觸發後設定 `status: full-ippon-pending`、暫停計時、totalScore 設 50、對手設 0；FULL IPPON triggers pending state requiring referee confirmation（不自動結束）；Finished match rejects further score actions（`finished` 時回傳 HTTP 409）
- [x] 2.4 新增犯規路由 `POST /api/v1/matches/:id/foul`（`sequence_judge`, `admin`）：實作 SHIDO foul assigns opponent score and WAZA-ARI（SHIDO +1 → 對手 +1分 +1 WAZA-ARI）；CHUI foul converts to three SHIDO units（CHUI → SHIDO +3、對手 +3分 +3 WAZA-ARI）；SHIDO DQ alert when count reaches six（SHIDO ≥ 6 → `shido-dq-pending`、廣播 `match:shido-dq`）；Deduction prevents negative scores（-SHIDO / -CHUI blocked at zero）；Foul update rejected for finished match（HTTP 409）；SHIDO DQ triggers pending state requiring referee confirmation（不自動結束）
- [x] 2.5 新增計時器設定路由 `PATCH /api/v1/matches/:id/duration`（計時器設定以 matchDuration 存入 Match）：更新 `matchDuration`，實作 duration confirmed via API before countdown starts
- [x] 2.6 新增計時微調路由 `PATCH /api/v1/matches/:id/timer-adjust`：寫入 `MatchScoreLog`（`actionType: 'timer-adjust'`）實作 timer adjust log persisted in MatchScoreLog

## 3. 後端 Socket.IO 廣播

- [x] 3.1 新增廣播事件：FULL IPPON Socket broadcast `match:full-ippon`（payload: `{ matchId, suggestedWinner }`）；`match:shido-dq`（payload: `{ matchId, suggestedDisqualified, suggestedWinner, shidoCount }`）；`match:foul-updated`（即時更新 SHIDO/WAZA-ARI）；`match:timer-adjusted`

## 4. 前端裁判介面 — PART 計分 UI

- [x] 4.1 在 `match-referee.component.html` 新增 PART sectional score buttons：三個 PART 分區各含 +2/+3/-2/-3 按鈕，以及 ALL PARTS +1/-1 按鈕，套用 `.glass-btn` / `.primary-btn` 樣式；按鈕在對應子項分數為 0 時顯示 disabled
- [x] 4.2 在 `match-referee.component.ts` 以 `signal<T>` 管理 PART score display above player card（`redParts`、`blueParts`）及 IPPON Signal，呼叫 foul API 更新 SHIDO/WAZA-ARI Signal

## 5. 前端裁判介面 — FULL IPPON 與 SHIDO/CHUI

- [x] 5.1 訂閱 `match:full-ippon`：顯示 FULL IPPON pending banner，FULL IPPON triggers pending state requiring referee confirmation（[Red Wins] / [Blue Wins] 按鈕**保留並高亮**，不隱藏）
- [x] 5.2 新增 SHIDO/CHUI 按鈕（+SHIDO / -SHIDO / +CHUI / -CHUI）呼叫 `/foul` API；以 `signal` 管理 `redShido` / `blueShido`；SHIDO and CHUI badges on referee and audience screens（裁判端）：≥1 顯示 SHIDO badge，CHUI 事件後顯示 CHUI badge
- [x] 5.3 訂閱 `match:shido-dq`：SHIDO DQ triggers pending state requiring referee confirmation，顯示 DQ banner（含 SHIDO 計次），[Red Wins] / [Blue Wins] 按鈕**保留並高亮**供裁判確認

## 6. 前端裁判介面 — 計時器設定與微調

- [x] 6.1 實作 timer setup modal shown before match start：場次 `status === 'pending'` 時顯示 modal，含 quick-select 2 min / quick-select 3 min 按鈕與確認按鈕
- [x] 6.2 確認按鈕呼叫 `PATCH /duration` API（confirm button saves duration and starts countdown）；API 成功後啟動本地倒數、關閉 modal；失敗時顯示 Toast（API error blocks start）
- [x] 6.3 實作 timer adjustment panel shown when paused：暫停時顯示微調面板（+1s/-1s/+10s/-10s/+1min/-1min）；time adjustment buttons modify displayed remaining time（-1s cannot go below zero）
- [x] 6.4 實作「繼續比賽」按鈕：resume without save ignores adjustments
- [x] 6.5 實作「儲存並繼續」按鈕：呼叫 `PATCH /timer-adjust` API（Save and resume applies adjustments and logs）

## 7. 前端觀眾端更新

- [x] 7.1 訂閱 `match:full-ippon`：實作 FULL IPPON overlay on audience display（Audience display FULL IPPON overlay，觀眾端 FULL IPPON 覆蓋層），`fixed inset-0 bg-black/80 z-50`，`FULL IPPON` 黃色大字；`match:ended` 時 overlay dismissed on match finalized
- [x] 7.2 訂閱 `match:foul-updated`：實作 CHUI badge on audience player row（SHIDO and CHUI badges on referee and audience screens 觀眾端）；SHIDO badge visible at count 1 or more；CHUI badge shown after CHUI event；no CHUI badge at zero
- [x] 7.3 新增 PART scores displayed on audience player row：WAZA-ARI count 顯示，PART score row rendered（PART 1、PART 2、PART 3 由左至右）

## 8. 驗收

- [x] 8.1 執行 `cd frontend && npm run build`，確認 Initial bundle 未超過 500kB 警告門檻（實測 456.10 kB）
