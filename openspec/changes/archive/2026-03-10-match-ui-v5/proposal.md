## Why

依據 SPEC-v5 規格書，現行柔術比賽（對打/寢技/格鬥）裁判端與觀眾端在傷停計時邏輯、UI 視覺呈現方面有多項待修正，包含傷停圖示需改以 CSS 繪製、傷停累積計時邏輯不正確、裁判端功能按鈕需精簡，以及觀眾端計分區視覺需加強辨識度與警告呈現方式需改為黃牌制。

## What Changes

- **傷停 icon 移除**：`faBriefcaseMedical` icon 改為 CSS 繪製的紅底白色「+」圓角方塊，裁判端與觀眾端皆須修改
- **傷停累積計時**：傷停時間依運動項目設上限（寢技/對打 120 秒，格鬥 180 秒），每位選手每場累積計算，傷停結束後倒數暫停但顯示保留
- **警告上限強制**：警告最多 4 個，達上限後按鈕停用
- **裁判端移除「取消上一筆」按鈕**：紅藍方底部操作列的 `undoLast` 按鈕移除
- **裁判端計分區底色**：紅方計分區底色改為淡粉紅色，藍方改為淡粉藍色
- **觀眾端視覺強化**：紅/藍計分區加框線（淡粉紅/淡粉藍）與陰影，得分區塊上方加「得分」標籤
- **觀眾端警告/優勢位置交換**：原本由左至右「優勢 → 警告」改為「警告 → 優勢」
- **觀眾端警告改為黃牌**：以 2×2 四格方框呈現，有警告時對應格變黃色，無警告為灰色，上限 4 個

## Capabilities

### New Capabilities

（無新能力）

### Modified Capabilities

- `ne-waza-injury-ownership`: 傷停計時邏輯由固定重設改為累積制，新增傷停上限（依運動項目），傷停結束後倒數暫停但 UI 顯示保留
- `match-scoring`: 移除裁判端「取消上一筆」按鈕；強制警告上限 4 個；紅/藍方計分區底色調整
- `match-audience-display`: 觀眾端計分區加框線與陰影、得分標籤、警告/優勢位置對調、警告改為 2×2 黃牌格呈現

## Impact

- 受影響 specs：`ne-waza-injury-ownership`、`match-scoring`、`match-audience-display`
- 受影響程式碼：
  - `frontend/src/app/features/match-referee/match-referee.component.html`
  - `frontend/src/app/features/match-referee/match-referee.component.ts`
  - `frontend/src/app/features/match-audience/match-audience.component.html`
  - `frontend/src/app/features/match-audience/match-audience.component.ts`
