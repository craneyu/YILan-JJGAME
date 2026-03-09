## 1. 計時器微調：新增 ±1 秒按鈕

> 對應規格：Referee timer fine-tune controls（ne-waza-scoring）

- [x] 1.1 實作 Referee timer fine-tune controls：在 `match-referee.component.html` 計時器暫停微調列（計時器微調按鈕區）新增 `▲ 1秒` 與 `▼ 1秒` 按鈕，呼叫 `adjustTimer(1)` 與 `adjustTimer(-1)`，樣式同既有微調按鈕（`glass-btn px-3 py-1 rounded-lg text-sm`）

## 2. 底部操作列合併與順序調整

> 對應規格：Referee scoring card bottom row layout（ne-waza-scoring）

- [x] 2.1 實作 Referee scoring card bottom row layout：重組 `match-referee.component.html` 紅方計分卡底部，將降伏勝、DQ、傷停、取消上一筆合併為單一 `flex flex-wrap gap-2` 橫列，順序為：降伏勝 → DQ → 傷停 → 取消上一筆
- [x] 2.2 實作 Referee scoring card bottom row layout：重組 `match-referee.component.html` 藍方計分卡底部，同紅方，順序：降伏勝 → DQ → 傷停 → 取消上一筆

## 3. 傷停按鈕 icon 改為 faPlus

> 對應規格：Injury timeout button icon（ne-waza-scoring）

- [x] 3.1 實作 Injury timeout button icon：在 `match-referee.component.ts` 新增 `faPlus` 圖示 import（從 `@fortawesome/free-solid-svg-icons`）
- [x] 3.2 實作 Injury timeout button icon：在 `match-referee.component.html` 紅方傷停按鈕改用 `<fa-icon [icon]="faPlus" />` icon，移除 emoji 文字
- [x] 3.3 實作 Injury timeout button icon：在 `match-referee.component.html` 藍方傷停按鈕同上

## 4. Socket 事件：Winner preview socket event

> 對應規格：Winner preview socket event（referee-judge-decision-flow）

- [x] 4.1 實作 Winner preview socket event：在 `socket.service.ts` 新增 `MatchWinnerPreviewEvent` 介面 `{ matchId: string; winner: 'red' | 'blue' }`，新增 `matchWinnerPreview$` Observable 訂閱 `match:winner-preview` 事件
- [x] 4.2 實作 Winner preview socket event：在 `socket.service.ts` 新增 `emitMatchWinnerPreview(eventId, matchId, winner)` 方法，emit `match:emit-winner-preview`
- [x] 4.3 實作 Winner preview socket event：在 `backend/src/sockets/index.ts` 新增 `match:emit-winner-preview` handler，廣播 `match:winner-preview` 至 `eventId` 房間

## 5. 裁判判決兩階段流程

> 對應規格：Referee judge decision two-phase flow（referee-judge-decision-flow）

- [x] 5.1 實作 Referee judge decision two-phase flow：在 `match-referee.component.ts` 新增 `judgeWinner = signal<'red' | 'blue' | null>(null)`
- [x] 5.2 實作 Referee judge decision two-phase flow：修改 `confirmJudgeDecision(winner)` 方法，不再直接呼叫 `endMatch()`，改為設置 `judgeWinner`、`pauseTimer()`、呼叫 `emitMatchWinnerPreview`
- [x] 5.3 實作 Referee judge decision two-phase flow：新增 `finalizeMatch()` 方法，呼叫 `endMatch(judgeWinner()!, 'judge')` 並顯示完成 dialog
- [x] 5.4 實作 Referee judge decision two-phase flow：新增 `goToNextMatch()` 方法，呼叫 API PATCH 後直接 `view.set('list')`，不顯示 dialog
- [x] 5.5 實作 Referee judge decision two-phase flow：在 `endMatch()` 與 `resetScoringState()` 加入 `judgeWinner.set(null)` 重置
- [x] 5.6 實作 Referee judge decision two-phase flow：更新 `match-referee.component.html` 裁判判決區塊，`@if (!judgeWinner())` 顯示紅/藍方勝按鈕；`@else` 顯示「結束比賽」（`finalizeMatch()`）與「下一場次」（`goToNextMatch()`）按鈕及勝方提示文字

## 6. 觀眾端接收勝方預覽

> 對應規格：Audience receives winner preview（referee-judge-decision-flow）

- [x] 6.1 實作 Audience receives winner preview：在 `match-audience.component.ts` import `MatchWinnerPreviewEvent`，新增訂閱 `socket.matchWinnerPreview$`，接收後設置 `matchResult` signal 顯示勝方橫幅
