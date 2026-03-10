## 1. 裁判端：傷停計時累積制的狀態設計

- [x] 1.1 在 `match-referee.component.ts` 中新增 `redInjuryVisible` / `blueInjuryVisible` signals，控制傷停顯示是否可見（一旦啟動過即設為 true，不再關閉）
- [x] 1.2 修改 `startInjuryTimeout()` 邏輯：不重設剩餘時間，依比賽類型設定初始上限（`matchDuration === 180` → 180 秒，否則 → 120 秒），初始化只在比賽載入時執行一次（傷停計時累積制的狀態設計）
- [x] 1.3 修改 `resumeFromInjury()` 邏輯：結束傷停時僅暫停倒數，不重設 `redInjuryActive`/`blueInjuryActive` visible 狀態（傷停計時累積制的狀態設計）
- [x] 1.4 實作傷停時間達零時自動停止並停用傷停按鈕（injury timeout limit reached）

## 2. 裁判端：傷停圖示改為 CSS 方塊

- [x] 2.1 在 `match-referee.component.html` 中，將傷停按鈕內的 `<fa-icon [icon]="faKitMedical">` 替換為 CSS-only 紅底白字「+」圓角方塊（傷停 icon 改為 CSS 方塊：`<div class="w-5 h-5 bg-red-600 text-white font-bold rounded-md flex items-center justify-center text-xs">+</div>`）
- [x] 2.2 移除 `match-referee.component.ts` 中已不需要的 `faKitMedical` / `faBriefcaseMedical` icon import（injury timeout with side ownership）

## 3. 裁判端：移除取消上一筆按鈕與警告上限

- [x] 3.1 在 `match-referee.component.html` 中移除紅方底部操作列的「取消」(`undoLast('red')`) 按鈕（undo last scoring action）
- [x] 3.2 在 `match-referee.component.html` 中移除藍方底部操作列的「取消」(`undoLast('blue')`) 按鈕（undo last scoring action）
- [x] 3.3 移除 `match-referee.component.ts` 中的 `undoLast()` 方法及相關 `redScoreLog`/`blueScoreLog` signals（如僅用於 undo）
- [x] 3.4 在 `match-referee.component.html` 中為紅/藍方警告加分按鈕加上 disabled 條件：`warnings >= 4`（warning count is capped at 4）

## 4. 裁判端：計分區底色調整

- [x] 4.1 在 `match-referee.component.html` 中，紅方計分區塊容器加上 `bg-red-950/30` class（裁判端計分區底色：referee scoring panel uses color-coded backgrounds）
- [x] 4.2 在 `match-referee.component.html` 中，藍方計分區塊容器加上 `bg-blue-950/30` class（裁判端計分區底色：referee scoring panel uses color-coded backgrounds）

## 5. 觀眾端：傷停顯示邏輯與 icon 更換

- [x] 5.1 在 `match-audience.component.ts` 中新增 `redInjuryVisible` / `blueInjuryVisible` signals，在 `injury:started` 時設為 true，**不在** `injury:ended` 時關閉（injury timeout display in audience scoreboard）
- [x] 5.2 在 `match-audience.component.html` 中，將傷停指示器的條件由 `redInjuryActive()` 改為 `redInjuryVisible()`（同藍方），使計時暫停後仍顯示（傷停顯示狀態管理）
- [x] 5.3 在 `match-audience.component.html` 中，將傷停 icon `<fa-icon [icon]="faBriefcaseMedical">` 替換為 CSS-only 紅底白字「+」方塊（injury timeout display in audience scoreboard）
- [x] 5.4 移除 `match-audience.component.ts` 中已不需要的 `faBriefcaseMedical` icon import

## 6. 觀眾端：計分區視覺強化

- [x] 6.1 在 `match-audience.component.html` 中，紅方列容器加上 `border border-red-400/40 shadow-lg shadow-red-900/20` class（觀眾端框線與陰影：audience score sections have color-coded borders and labels）
- [x] 6.2 在 `match-audience.component.html` 中，藍方列容器加上 `border border-blue-400/40 shadow-lg shadow-blue-900/20` class（觀眾端框線與陰影：audience score sections have color-coded borders and labels）
- [x] 6.3 在 `match-audience.component.html` 中，紅/藍方大分數方塊上方各加上 `<div class="text-white/50 text-sm mb-1">得分</div>` 標籤（audience score sections have color-coded borders and labels）

## 7. 觀眾端：警告黃牌格與位置對調

- [x] 7.1 在 `match-audience.component.html` 中，將紅/藍方的「警告」與「優勢」顯示區塊位置對調（警告左側、優勢右側）（warning and advantage positions are swapped in audience display）
- [x] 7.2 在 `match-audience.component.html` 中，將警告的數字顯示改為 2×2 四格黃牌格（警告黃牌格的渲染：`grid grid-cols-2 gap-1`），使用 `@for` 渲染 4 個 `div`，index < warningCount 時套用 `bg-yellow-400`，否則套用 `bg-white/20`（audience warning display uses yellow card grid）
