## 1. CSS 動畫準備

- [x] 1.1 在 `frontend/src/styles.css` 的 `@layer components` 中新增 `.penalty-light-flash` class，定義 `@keyframes` 閃爍動畫（亮→暗→亮，持續約 600ms），供 PART score display above player card 的燈號閃爍使用

## 2. TypeScript Signal 狀態與閃爍邏輯

- [x] 2.1 在 `fighting-audience.component.ts` 新增 `redFlashingIndex` 與 `blueFlashingIndex` signals（型別 `number`，初始值 `-1`），使用 effect() + setTimeout 偵測值變化觸發閃爍（設計：使用 effect() + setTimeout 偵測值變化觸發閃爍）
- [x] 2.2 在 `effect()` 中記錄前次值（`previousRedParts` / `previousBlueParts`），首次執行時直接賦值不觸發 flash；後續偵測任一 index 增加則設對應 flashingIndex，700ms 後清除（設計：使用 effect() + setTimeout 偵測值變化觸發閃爍）

## 3. HTML 模板改版

- [x] 3.1 將紅方的 P1/P2/P3 橫排數字卡片區塊替換為垂直排列的三顆圓形燈：移除外層 border 框，套用 RWD 斷點 class（`w-10 h-10 md:w-14 md:h-14 lg:w-16 lg:h-16 xl:w-20 xl:h-20`），標籤 P1/P2/P3 置於圓心，實作 PART score display above player card 的亮/熄滅樣式切換與 flash class binding（設計：RWD 圓形尺寸以 Tailwind 斷點 class 實作、CSS @keyframes 定義於 styles.css）
- [x] 3.2 將藍方的 P1/P2/P3 區塊套用相同的圓形燈號結構，確保紅藍方行為一致，並綁定 `blueFlashingIndex` signal（設計：RWD 圓形尺寸以 Tailwind 斷點 class 實作）

## 4. 驗證

- [x] 4.1 執行 `cd frontend && npm run build`，確認 Initial bundle 未超過 500kB 警告門檻
