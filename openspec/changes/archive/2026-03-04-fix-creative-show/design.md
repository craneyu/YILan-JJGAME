## Context

創意演武（Show）賽事流程中，賽序裁判介面（`creative-sequence-judge`）與觀眾端（`creative-audience`）存在多項計時與即時更新問題：

- 計時器啟動後顯示 `NaN:NaN`，原因為前端以 `Date` 建構函式解析 ISO 字串時的型別問題，或 `setInterval` 累加器初始值有誤
- 計時顯示未即時更新（依賴 `timerElapsedMs` 靜態值而非動態計算）
- 暫停後無法繼續計時（`timerStoppedAt` 未記錄暫停前的累計毫秒）
- 隊伍選擇清單排序不一致，沒有依組別分組
- `creative:score:calculated` 廣播 payload 缺少 `teamId` 與 `penalties` 陣列，使賽序裁判與觀眾端無法正確消費
- 觀眾端不會即時更新隊伍/參賽者資訊與計分結果

## Goals / Non-Goals

**Goals:**

- 修正 NaN:NaN 計時顯示問題，使用 `Date.now() - new Date(timerStartedAt).getTime()` 計算
- 加入暫停/繼續/歸零計時功能，狀態持久化至 `CreativeGameState`
- 計時畫面即時顯示當前組別、隊伍名稱、參賽者名稱
- 賽序裁判收到 `creative:score:calculated` 後即時顯示計算結果
- 觀眾端收到 `creative:scoring-opened` 後即時更新隊伍資訊
- 觀眾端收到 `creative:score:calculated` 後即時顯示技術分、表演分、扣分、最終分
- `creative:score:calculated` 廣播補充 `teamId` 與 `penalties` 欄位
- 隊伍選擇清單依 category → order 排序

**Non-Goals:**

- 不變更計分演算法（去最高最低取中間3位邏輯不變）
- 不新增新的後端 API 路由
- 不修改 `creative-scoring-judge` 評分操作介面

## Decisions

### 計時器狀態模型擴充：timerStatus 欄位

現有 `CreativeGameState` 欠缺計時器狀態欄位，導致前端只能用 `timerStartedAt` 是否存在來判斷計時器狀態，暫停後無法區分「停止」與「暫停」。

決定：在 `CreativeGameState` 的 Mongoose Schema 新增 `timerStatus: 'idle' | 'running' | 'paused'` 欄位（預設 `'idle'`），並保留 `timerElapsedMs` 用於累積暫停前的毫秒數。

替代方案：用 `timerPausedAt` 有無來判斷狀態 → 否決，欄位語意不明確，繼續/暫停判斷複雜。

### 計時顯示修正：timestamp-based 計算

現有前端在 `setInterval` 中用加法累計秒數，第一幀的 `timerStartedAt` 解析錯誤時直接出現 NaN。

決定：前端 `setInterval` 改為每秒執行：
```
elapsed = elapsedBase + (Date.now() - new Date(timerStartedAt).getTime())
```
其中 `elapsedBase` 為暫停前累積的 `timerElapsedMs`。若 `timerStartedAt` 無法解析，顯示 `00:00`。

### creative:score:calculated 廣播 payload 補充

現有廣播只含計算數值，缺 `teamId` 與 `penalties` 陣列，導致前端無法確認是哪支隊伍的結果，也無法顯示扣分明細。

決定：在 `creativeScoreController.ts` 中廣播時補充：
- `teamId: string`（從 `gameState.currentTeamId`）
- `penalties: Array<{ type: string, deduction: number, count: number }>`（從當前 penalty 清單計算）

### 觀眾端與賽序裁判即時更新策略

目前觀眾端只在頁面載入時取得資料，之後不監聽新的 Socket 事件。

決定：
- 觀眾端訂閱 `creative:scoring-opened`：更新 `currentTeamName` / `currentMembers` signal
- 觀眾端訂閱 `creative:score:calculated`：更新 `scoreResult` signal（含 technicalTotal, artisticTotal, penalties, finalScore）
- 賽序裁判計時畫面訂閱 `creative:score:calculated`：更新 `lastScoreResult` signal，在計時器下方顯示結果面板

### 隊伍清單排序

決定：前端在呈現隊伍選擇清單前，以 `category`（依 event.categoryOrder 順序）→ `order`（升冪）排序，不依賴後端回傳順序。

## Risks / Trade-offs

- [Risk] `CreativeGameState` schema 新增欄位需預設值，否則舊資料讀取時 `timerStatus` 為 undefined → 緩解：Mongoose Schema 設定 `default: 'idle'`，前端用 `?? 'idle'` fallback
- [Risk] 計時器暫停後頁面重新整理，`timerElapsedMs` 需從後端還原 → 緩解：頁面載入時讀取 `creative_game_states` 並還原 signal 狀態
- [Risk] `creative:score:calculated` payload 格式變更可能影響已有訂閱端 → 緩解：新增欄位為向後相容（現有消費端只讀 `finalScore` 等，不會因多出欄位而錯誤）

## Migration Plan

1. 後端：更新 `CreativeGameState` Mongoose Schema 新增 `timerStatus` 欄位
2. 後端：更新 `creativeTimerController.ts` 處理 pause / resume / reset 邏輯
3. 後端：更新 `creativeScoreController.ts` 廣播時補充 `teamId` 與 `penalties`
4. 前端：更新 `creative-sequence-judge.component.ts/html` — 計時修正、team info display、pause/resume/reset、score result display
5. 前端：更新 `creative-audience.component.ts/html` — 訂閱新事件並即時更新 UI
6. 無資料遷移需求：現有 `creative_game_states` 文件在下次計時操作時會被更新覆寫
