## Context

裁判介面（`match-referee.component`）目前的操作流程與按鈕佈局在現場競賽時發現多個體驗問題。計時器僅支援 10 秒與 1 分鐘微調；每側卡片底部按鈕排序為「降伏勝 → DQ → 傷停 → 取消上一筆」，DQ 與降伏勝不連貫；裁判判決按鈕一按立即呼叫 `endMatch()` 寫入 DB 並廣播 `match:ended`，裁判無反悔機會且觀眾端也無過渡顯示。

## Goals / Non-Goals

**Goals:**

- 計時器微調增加 ±1 秒精度
- 底部按鈕列順序優化：降伏勝 → DQ → 傷停 → 取消上一筆
- 傷停圖示改為語意清楚的 FontAwesome `faPlus`
- 裁判判決拆為「宣告」（同步觀眾）與「結束」（寫 DB）兩階段
- 提供「下一場次」快捷：靜默結束並返回列表

**Non-Goals:**

- 不修改計分演算法或警告累積邏輯
- 不更動觀眾端版面（已於 ne-waza-audience-redesign 完成）
- 不改動後端 Match model 或 API

## Decisions

### 計時器微調按鈕

在暫停狀態顯示六顆微調按鈕，順序：▲1秒 ▼1秒 ▲10秒 ▼10秒 ▲1分 ▼1分。
呼叫既有 `adjustTimer(delta: number)` 方法，`delta` 值分別為 1 / -1 / 10 / -10 / 60 / -60。

### 底部操作列合併

每側計分卡底部改為單一 `flex flex-wrap gap-2` 橫列，依序排放：
`[降伏勝] [DQ] [↺ 取消上一筆] [+ 傷停]`

傷停觸發後，原地展開倒數 + 繼續按鈕（與現有傷停邏輯一致，僅移動位置）。

### 判決兩階段流程

新增 signal：`judgeWinner = signal<'red' | 'blue' | null>(null)`

**階段一：宣告勝方**

`confirmJudgeDecision(winner)` 改為：
1. `judgeWinner.set(winner)`
2. `pauseTimer()`
3. emit `match:emit-winner-preview` → 後端廣播 `match:winner-preview` 至觀眾端
4. 裁判畫面隱藏「紅/藍方勝」按鈕，顯示「結束比賽」+ 「下一場次」

**階段二：結束比賽**

- **「結束比賽」**：呼叫 `endMatch(judgeWinner(), 'judge')` → PATCH DB → emit `match:ended` → 顯示完成 dialog → 留在頁面
- **「下一場次」**：呼叫 `endMatch(judgeWinner(), 'judge')` → PATCH DB → emit `match:ended` → 靜默回到列表（無 dialog）

觀眾端新增訂閱 `match:winner-preview` 事件，接收後即顯示勝方橫幅（不等 `match:ended`）。

### Socket 事件

新增：
- 前端 emit：`match:emit-winner-preview` payload `{ eventId, matchId, winner: 'red'|'blue' }`
- 後端廣播：`match:winner-preview` payload `{ matchId, winner: 'red'|'blue' }`

## Risks / Trade-offs

- [取捨] 若裁判按了「紅/藍方勝」後網路中斷，觀眾看到勝方橫幅但 DB 未寫入，刷新後橫幅消失——可接受，屬極端邊界情況，LAN 環境穩定性足夠
- [取捨] 「下一場次」靜默完成，不顯示成功 dialog，減少操作步驟但失去視覺回饋——符合競賽流程加速需求
