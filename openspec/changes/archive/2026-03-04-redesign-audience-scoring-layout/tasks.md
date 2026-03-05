## 1. 介面重新排版與佈局調整

- [x] 1.1 修改 `frontend/src/app/features/creative-audience/creative-audience.component.html`，根據「觀眾畫面佈局重新規劃」設計決策，重新調整隊伍資訊與主內容區塊的佈局。
- [x] 1.2 實作「Audience page features a compact integrated layout」需求，整合計時器與計分細節至統一的視覺結構中。

## 2. 分數整合與總分隱藏

- [x] 2.1 根據「分數整合單行顯示」設計決策，在 `creative-audience.component.html` 中將技術分與表演分改為水平並排顯示。
- [x] 2.2 實作「Audience page displays integrated single-line score」需求，確保分數在接收到 `creative:score:calculated` 事件時能正確同步顯示。
- [x] 2.3 執行「移除大總分顯示」設計決策，從範本中移除 `grandTotal` 的顯示欄位。
- [x] 2.4 確保「Final score remains prominent」，調整最終得分的字體大小與視覺樣式，使其成為畫面焦點。

## 3. 樣式優化與驗證

- [x] 3.1 在 `creative-audience.component.css` 或透過 Tailwind class 優化 Glassmorphism 效果，確保在各種螢幕尺寸下的易讀性。
- [x] 3.2 驗證佈局調整後，計時器顏色與狀態切換（`MIN_MS`/`MAX_MS`）依然正確反映於新排版中。
