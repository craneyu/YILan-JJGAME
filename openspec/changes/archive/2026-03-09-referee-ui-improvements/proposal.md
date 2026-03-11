## Why

裁判介面在實際競賽使用中發現數個操作體驗問題：計時器微調精度不足（最小單位 10 秒）、按鈕排列順序不符合操作邏輯（DQ 在降伏勝前、傷停與取消分散）、裁判判決按鈕一按即立即結束場次（無確認緩衝、觀眾端也缺乏過渡顯示），以及傷停圖示語意不清。

## What Changes

- 計時器微調新增 ±1 秒按鈕（共六顆：▲1秒、▼1秒、▲10秒、▼10秒、▲1分、▼1分）
- 每側計分卡底部列重組：降伏勝、DQ、傷停、取消上一筆並排於同一橫列，符合「宣判 → 結束 → 復原 → 急救」的操作優先順序
- 傷停按鈕圖示由 🚑 emoji 改為 FontAwesome `faPlus` icon
- 裁判判決流程拆為兩階段：「紅/藍方勝」按鈕只廣播結果至觀眾端（顯示勝方橫幅），不直接結束場次；改以「結束比賽」和「下一場次」按鈕執行實際結束邏輯

## Capabilities

### New Capabilities

- `referee-judge-decision-flow`：裁判判決兩階段流程——宣告勝方（同步觀眾）與正式結束比賽分離，並提供「下一場次」快速跳轉

### Modified Capabilities

- `ne-waza-scoring`：計時器微調增加 ±1 秒；底部操作列布局調整（按鈕順序、傷停 icon）

## Impact

- Affected specs: `ne-waza-scoring`（修改）、`referee-judge-decision-flow`（新增）
- Affected code:
  - `frontend/src/app/features/match-referee/match-referee.component.html`（按鈕布局、判決流程 UI）
  - `frontend/src/app/features/match-referee/match-referee.component.ts`（判決 signal、endMatch 邏輯、下一場次方法）
  - `frontend/src/app/core/services/socket.service.ts`（新增觀眾端宣告勝方 emit 方法）
  - `backend/src/sockets/index.ts`（新增 `match:emit-winner-preview` 廣播）
  - `frontend/src/app/features/match-audience/match-audience.component.html`（接收勝方預覽，不等 match:ended 才顯示橫幅）
  - `frontend/src/app/features/match-audience/match-audience.component.ts`（訂閱 winnerPreview 事件）
