## Context

裁判介面（`match-referee`）與觀眾端（`match-audience`）在 `referee-ui-improvements` 實作完成後，實際操作中發現四個 UI / 行為問題：

1. **底部列縮排**：紅/藍方計分卡底部操作列缺少 `pl-12` 縮排，導致「降伏勝」按鈕與上方負向行的「-2」按鈕在 x 軸上無法對齊。
2. **submissionPending 無法清除**：當裁判誤按「降伏勝」使 `submissionPending` 進入等待確認態，若接著按「取消上一筆」，系統會 pop 出 score 99 的 log，但 `submissionPending` signal 未同步清除，導致 UI 仍顯示確認按鈕。
3. **judgeWinner 無取消出口**：裁判誤按「紅方勝」或「藍方勝」後，`judgeWinner` signal 設定完成，UI 切換至「結束比賽」/「下一場次」視圖，但此前沒有取消路徑，裁判無法回到選擇頁面。
4. **觀眾端勝方橫幅雜訊**：橫幅顯示了 `<fa-icon faTrophy>` 圖示與 `{{ methodLabel() }}` 判決方式文字（如「裁判判決」），視覺上過於複雜，只需保留勝方文字即可。

## Goals / Non-Goals

**Goals:**
- 讓「降伏勝」按鈕 x 位置與上方「-2」對齊（視覺一致性）
- 修正 `undoLast()` 在彈出 score 99 log 時同步清除 `submissionPending`
- 在 `judgeWinner()` 已設定時新增「取消宣告」按鈕，呼叫 `judgeWinner.set(null)`
- 觀眾端勝方橫幅僅顯示勝方文字，移除 trophy icon 及判決方式標籤

**Non-Goals:**
- 計分同步機制（已確認正常，無需修改）
- 任何新功能或新 Socket 事件
- 後端程式修改

## Decisions

### 計分按鈕統一尺寸

正向行（+2/+3/+4/+A優勢/+P警告/STALLING）與負向行（-2/-3/-4/-A優勢/-P警告）的每個按鈕加上 `min-w-[3.5rem] h-12`。
- `min-w-[3.5rem]`：確保所有按鈕最小寬度一致，避免單字（+2）比雙行（+A優勢）窄
- `h-12`：固定高度，使單行文字按鈕（+2）與雙行文字按鈕（+A優勢）等高
- 不改變 `px-3 py-2` 以外的樣式，兩個尺寸 class 附加在現有 class 後方即可

### 底部列縮排對齊

底部操作列的父容器加上 `pl-12`，與上方負向行按鈕區的左側 padding 對齊。
不採用 grid 或 absolute 定位，原有 `flex flex-wrap gap-2` 結構不變，僅加縮排。

### undoLast 清除 submissionPending

在 `undoLast(side)` 方法中，取出最後一筆 log 後，若其 `score === 99`，額外執行 `this.submissionPending.set(null)`。
不在 `applyScore` 的 undo path 做額外判斷，最小修改原則。

### judgeWinner 取消宣告按鈕

在裁判判決區塊的 `@else`（`judgeWinner()` 已設）段，現有「結束比賽」與「下一場次」按鈕旁加入「取消宣告」按鈕，class 使用 `glass-btn`（非破壞性中性操作），直接呼叫 `judgeWinner.set(null)`。
不重置計時器或清除其他狀態，僅回到判決前的按鈕視圖。

### 觀眾端勝方橫幅精簡

從 `match-audience.component.html` 勝方橫幅中移除 `<fa-icon [icon]="faTrophy">` 與包含 `{{ methodLabel() }}` 的 `<span>`。
同步從 `match-audience.component.ts` 移除 `faTrophy` import 與 `methodLabel` computed signal，清除 dead code。

## Risks / Trade-offs

- [風險] 移除 `methodLabel` computed 後若其他地方有引用 → 搜尋確認無其他參照再刪除
- [風險] `undoLast` 修改後若計分 log 資料結構有例外 → 僅在 `score === 99` 條件下觸發，影響範圍極小
- [取捨] 「取消宣告」不重置計時器：若裁判取消後比賽繼續，計時器仍在暫停狀態，需手動恢復。這是可接受行為，避免過度自動化。
