## Context

目前觀眾端缺乏統一入口：audience role 登入後直接進入演武觀眾畫面，無法選擇其他運動項目；`match-audience` 組件的 `matchType` 硬編碼為 `ne-waza`，無法顯示對打或格鬥場次。

裁判端「降伏」按鈕（`addSubmission`）目前以 1 分記錄得分並立即呼叫 `endMatch`，不符合實際裁判流程——應先登記降伏事件（99 分），再由裁判人工確認勝負。

## Goals / Non-Goals

**Goals:**
- 新增 `/audience-select` 統一觀眾入口，自動偵測 active event，顯示 5 個運動項目卡片
- `match-audience` 支援動態 `matchType`（ne-waza / fighting / contact）
- 「降伏」分數改為 99 分，移除自動結束場次邏輯
- 裁判人工按「紅方勝」或「藍方勝」後才結束場次，method 記錄為 `submission`

**Non-Goals:**
- 不修改後端 API（無新端點、無 Schema 變動）
- 不修改 Socket.IO 事件
- 不新增 admin 端功能
- 不支援多個同時進行的 active event（取 `open=true` 清單第一筆）

## Decisions

### 觀眾選擇器自動偵測 Active Event

呼叫既有 `GET /api/v1/events?open=true`（回傳 pending/active 狀態、依 createdAt 降序），取第一筆作為當前賽事。無需新增後端端點。

若清單為空，顯示「尚無進行中賽事，請稍後再試」提示卡，不顯示 5 個項目按鈕。

### Match Audience matchType 動態化

`match-audience` 組件從 `ActivatedRoute.queryParams` 讀取 `matchType`（預設 `ne-waza`）。`AudienceSportSelectorComponent` 導航時帶上 `matchType` query param：

```
/match-audience?matchType=ne-waza&eventId=xxx
/match-audience?matchType=fighting&eventId=xxx
/match-audience?matchType=contact&eventId=xxx
```

### 降伏 Pending State 使用 Signal 追蹤

新增 `submissionPending = signal<'red' | 'blue' | null>(null)` 追蹤「是否有待確認的降伏」。

`addSubmission(winner)` 改為：
1. 呼叫 `applyScore(winner, 'score', 99)` 記錄 99 分
2. 暫停計時器
3. 設定 `submissionPending.set(winner)`
4. 顯示 SweetAlert2 toast「降伏已登記，請確認勝負」
5. **不**呼叫 `endMatch`

`confirmJudgeDecision(winner)` 與 `confirmDQ(loser)` 不變，但 `endMatch` 內部判斷：若 `submissionPending()` 非 null，method 改用 `'submission'`。

### Login 頁導向修改

audience role 登入後一律導向 `/audience-select`，不區分 kata/creative 類型。`creative/audience` 等具體路由改由選擇頁負責轉發。

## Risks / Trade-offs

| 風險 | 緩解 |
|------|------|
| 降伏後裁判誤按錯誤勝方 | SweetAlert2 確認 Dialog 二次確認，操作不可撤銷但符合現有 endMatch 設計 |
| events?open=true 同時存在多筆 active event | 取第一筆（最新），這是 LAN 賽事單場景的合理假設；複雜排程場景不在 scope |
| match-audience 舊書籤失效（無 matchType param） | 預設值 `ne-waza`，向下相容 |
