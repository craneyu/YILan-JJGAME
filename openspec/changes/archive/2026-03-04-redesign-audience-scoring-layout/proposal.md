## Why

### 動機與背景
目前的觀眾畫面（創意演武）計分與計時排版過於分散，大總分的顯示佔據過多空間且並非觀眾關注的首要資訊。為了提升觀賽體驗，需要將計分與計時重新規劃，使資訊呈現更為緊湊且易於閱讀。

## What Changes

### 方案描述
- **重新排版觀眾畫面**：將計分與計時區塊進行整合，優化視覺層次。
- **分數整合單行**：將技術分（Technical）與表演分（Artistic）整合至同一行顯示，減少垂直空間佔用。
- **移除大總分顯示**：在大螢幕顯示中移除「大總分」欄位，專注於顯示最終得分與各項細節。
- **計時器位置調整**：將計時器與當前狀態資訊進行更合理的佈局配置。

### Non-goals（不做什麼）
- 不修改後端計分邏輯或 API 資料格式。
- 不影響管理員或裁判端的 UI。
- 不修改雙人演武（Duo）的觀眾畫面。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `creative-show-score-display`: 調整分數呈現方式為單行整合，並移除大總分。
- `creative-show-timer-ux`: 重新規劃計時器與計分區塊的排版佈局。

## Impact

- **Affected specs**: `creative-show-score-display`, `creative-show-timer-ux`
- **Affected code**:
  - `frontend/src/app/features/creative-audience/creative-audience.component.html` (UI 排版)
  - `frontend/src/app/features/creative-audience/creative-audience.component.ts` (配合 UI 調整的資料處理)
  - `frontend/src/app/features/creative-audience/creative-audience.component.css` (樣式調整)
