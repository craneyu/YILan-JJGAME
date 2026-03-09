## Why

裁判介面在 `referee-ui-improvements` 完成後，實際使用中發現五個問題：底部操作列縮排不一致導致「降伏勝」與上方負向行按鈕未對齊；正向行與負向行的計分按鈕因文字長短不同而大小不一；誤按「降伏勝」後 `submissionPending` 無法清除；誤按判決宣告後沒有取消出口；觀眾端勝方橫幅顯示了多餘的 trophy icon 與判決方式文字。

## What Changes

- 底部操作列加上 `pl-12` 縮排，使「降伏勝」與負向行「-2」對齊
- 正向行與負向行所有計分按鈕統一固定寬高（`min-w-[3.5rem] h-12`），使加分與減分按鈕視覺上完全等大
- `undoLast()` 撤銷最後一筆分數時，若最後一筆為降伏（score 99），同時清除 `submissionPending`
- 判決宣告後（`judgeWinner` 已設）新增「取消宣告」按鈕，呼叫 `judgeWinner.set(null)` 回到判決前狀態
- 觀眾端勝方橫幅移除 `<fa-icon faTrophy>` icon 及 `{{ methodLabel() }}` 判決方式文字

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `ne-waza-scoring`：底部列對齊修正；計分按鈕統一尺寸；`undoLast` 清除 `submissionPending`；判決宣告新增取消按鈕
- `referee-judge-decision-flow`：宣告勝方後可取消，回到判決按鈕畫面
- `ne-waza-audience-layout`：勝方橫幅移除 trophy icon 及判決方式標籤

## Impact

- Affected specs: `ne-waza-scoring`、`referee-judge-decision-flow`、`ne-waza-audience-layout`
- Affected code:
  - `frontend/src/app/features/match-referee/match-referee.component.html`（底部列縮排、取消宣告按鈕）
  - `frontend/src/app/features/match-referee/match-referee.component.ts`（`undoLast` 清 `submissionPending`）
  - `frontend/src/app/features/match-audience/match-audience.component.html`（移除 icon 與 methodLabel）
  - `frontend/src/app/features/match-audience/match-audience.component.ts`（移除 `faTrophy` / `methodLabel` computed）
