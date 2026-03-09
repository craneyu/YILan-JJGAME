## 1. 計分按鈕統一尺寸（Ne-Waza scoring button layout）

- [x] 1.1 實作 Ne-Waza scoring button layout 計分按鈕統一尺寸：在 `match-referee.component.html` 紅方正向行所有按鈕（+2、+3、+4、+A優勢、+P警告、STALLING）加上 `min-w-[3.5rem] h-12`
- [x] 1.2 實作 Ne-Waza scoring button layout 計分按鈕統一尺寸：在 `match-referee.component.html` 紅方負向行所有按鈕（-2、-3、-4、-A優勢、-P警告）加上 `min-w-[3.5rem] h-12`
- [x] 1.3 實作 Ne-Waza scoring button layout 計分按鈕統一尺寸：在 `match-referee.component.html` 藍方正向行所有按鈕同上，加上 `min-w-[3.5rem] h-12`
- [x] 1.4 實作 Ne-Waza scoring button layout 計分按鈕統一尺寸：在 `match-referee.component.html` 藍方負向行所有按鈕同上，加上 `min-w-[3.5rem] h-12`

## 2. 底部列縮排對齊（Ne-Waza scoring button layout）

- [x] 2.1 實作 Ne-Waza scoring button layout 底部列對齊：在 `match-referee.component.html` 紅方計分卡底部操作列（含降伏勝、DQ、傷停、取消上一筆的 `flex flex-wrap gap-2` div）加上 `pl-12`，使「降伏勝」按鈕與上方負向行「-2」對齊
- [x] 2.2 實作 Ne-Waza scoring button layout 底部列對齊：在 `match-referee.component.html` 藍方計分卡底部操作列同上，加上 `pl-12`

## 3. Undo 清除 submissionPending（Referee records Ne-Waza scores per side）

- [x] 3.1 實作 Referee records Ne-Waza scores per side：在 `match-referee.component.ts` 的 `undoLast(side)` 方法中，取出最後一筆 log 後，若其 `score === 99`，額外呼叫 `this.submissionPending.set(null)` 清除降伏等待狀態

## 4. 取消宣告按鈕（Referee judge decision two-phase flow）

- [x] 4.1 實作 Referee judge decision two-phase flow：在 `match-referee.component.html` 裁判判決區塊的 `@else`（`judgeWinner()` 已設）段，在「結束比賽」與「下一場次」按鈕旁新增「取消宣告」按鈕（`glass-btn` 樣式），點擊時呼叫 `judgeWinner.set(null)`

## 5. 觀眾端勝方橫幅精簡（Match result display）

- [x] 5.1 實作 Match result display：在 `match-audience.component.html` 勝方橫幅中移除 `<fa-icon [icon]="faTrophy">` 圖示元素及包含 `{{ methodLabel() }}` 的 `<span>` 元素
- [x] 5.2 實作 Match result display：在 `match-audience.component.ts` 移除 `faTrophy` 的 import 宣告及 class 屬性（`faTrophy = faTrophy`），並移除 `methodLabel` computed signal
