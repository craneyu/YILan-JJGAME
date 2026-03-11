## 1. Socket 事件：傷停歸屬

> 對應規格：Ne-Waza injury timeout with side ownership

- [x] 1.1 實作傷停 Socket 事件新增：在 `socket.service.ts` 新增 `injuryStarted$` 與 `injuryEnded$` Observable，訂閱 `injury:started` / `injury:ended` 事件，payload 型別 `{ eventId: string; matchId: string; side: 'red' | 'blue'; durationSec?: number }`
- [x] 1.2 在 `socket.service.ts` 新增 `emitInjuryStarted(eventId, matchId, side, durationSec)` 與 `emitInjuryEnded(eventId, matchId, side)` 方法（實作 Injury timeout with side ownership）
- [x] 1.3 在 `backend/src/sockets/index.ts` 監聽 `injury:started` / `injury:ended` 並廣播至 `eventId` 房間

## 2. 裁判介面：傷停按鈕移至各側

> 對應規格：Ne-Waza injury timeout with side ownership（referee buttons）

- [x] 2.1 實作裁判介面：傷停按鈕下移至各側：移除 `match-referee.component.html` 計時器區的共用 `[+傷停 (2分)]` 按鈕及 `injuryActive()` overlay
- [x] 2.2 在 `match-referee.component.html` 紅方計分卡底部新增 `[傷停 2分]` 按鈕（`[disabled]="redInjuryActive()"`)
- [x] 2.3 在 `match-referee.component.html` 藍方計分卡底部新增 `[傷停 2分]` 按鈕（`[disabled]="blueInjuryActive()"`)
- [x] 2.4 在 `match-referee.component.ts` 將原 `injuryActive` / `injuryRemaining` signal 拆為 `redInjuryActive` / `redInjuryRemaining` 與 `blueInjuryActive` / `blueInjuryRemaining`
- [x] 2.5 修改 `startInjuryTimeout()` 為 `startInjuryTimeout(side: 'red' | 'blue')`，啟動對應側計時並呼叫 `emitInjuryStarted`
- [x] 2.6 修改 `resumeFromInjury()` 為 `resumeFromInjury(side: 'red' | 'blue')`，停止對應側計時並呼叫 `emitInjuryEnded`
- [x] 2.7 在各側計分卡內顯示傷停倒數（當 `redInjuryActive()` / `blueInjuryActive()` 為 true 時）及繼續比賽按鈕

## 3. 觀眾計分板：上下兩列布局

> 對應規格：Ne-Waza audience scoreboard two-row layout

- [x] 3.1 實作 Ne-Waza audience scoreboard two-row layout 及觀眾版面：上下兩列布局：重寫 `match-audience.component.html`，整體結構改為 `flex-col`：紅方列 → 藍方列 → 計時器列
- [x] 3.2 紅方列：左側選手姓名（`font-black text-5xl text-white`）、中段 優勢/警告 標籤+數值、右側紅色背景分數方塊（`bg-red-700 text-8xl font-black text-white`）
- [x] 3.3 藍方列：結構同上，右側改藍色背景（`bg-blue-700`）
- [x] 3.4 實作 Timer display in audience view：計時器列靠右對齊，灰色大字（`text-6xl font-mono text-white/40`），30秒以下變紅
- [x] 3.5 實作 Match result display：輸方列 opacity 降低，顯示勝方橫幅；背景改為 `bg-gray-950`

## 4. 觀眾計分板：傷停顯示

> 對應規格：Injury timeout display in audience scoreboard

- [x] 4.1 實作 Injury timeout display in audience scoreboard：在 `match-audience.component.ts` 新增 `redInjuryActive` / `redInjuryRemaining` / `blueInjuryActive` / `blueInjuryRemaining` signals
- [x] 4.2 訂閱 `socket.injuryStarted$`，依 `side` 啟動對應倒數（本地 setInterval）
- [x] 4.3 訂閱 `socket.injuryEnded$`，停止對應側倒數並清除 signal
- [x] 4.4 在 `match-audience.component.html` 各側列內條件顯示傷停倒數（`@if (redInjuryActive())`），格式：`⚠ 傷停中 MM:SS`
