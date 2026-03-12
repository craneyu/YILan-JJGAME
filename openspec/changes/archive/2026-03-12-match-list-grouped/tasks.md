## 1. 共用分組邏輯

- [x] 1.1 定義 `WEIGHT_CLASS_ORDER` 固定索引表以實作量級排序使用固定索引表；定義 `WeightGroup`、`CategoryGroup` TypeScript 介面，供兩個元件共用（使用 `computed()` Signal 做純前端分組）
- [x] 1.2 實作分組輔助函式：依組別順序：male → female → mixed 排序、量級依固定索引表排序、同量級內依 `scheduledOrder` 升序

## 2. 對打裁判（fighting-referee）

- [x] 2.1 在 `fighting-referee.component.ts` 新增 `groupedMatches` computed signal，以 `fightingMatches()` 為來源套用分組邏輯，實現 match list grouped by category and weight class
- [x] 2.2 更新 `fighting-referee.component.html` 列表視圖：以 `@for groupedMatches()` 巡覽，渲染組別 section header 顯示 Chinese label（男子組/女子組）及量級 sub-header，保留現有場次卡片樣式（group headers display category and weight class labels）

## 3. 寢技裁判（ne-waza-referee）

- [x] 3.1 在 `ne-waza-referee.component.ts` 新增 `groupedMatches` computed signal，以 `neWazaMatches()` 為來源套用同一分組邏輯
- [x] 3.2 更新 `ne-waza-referee.component.html` 列表視圖：同對打，渲染兩層分組標題，保留場次卡片（match list grouped by category and weight class）

## 4. 驗證

- [x] 4.1 執行 `cd frontend && npm run build` 確認 Initial bundle 未超過 500kB 警告門檻
