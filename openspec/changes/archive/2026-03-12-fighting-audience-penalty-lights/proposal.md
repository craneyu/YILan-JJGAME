## Why

目前觀眾顯示頁的 P1/P2/P3（部分得分）以橫排數字卡片呈現，資訊密度低且不直覺。改為垂直燈號設計，每次得分亮燈並閃爍一次，視覺張力更強、觀眾可即時感受得分狀態。

## What Changes

- P1/P2/P3 區塊從「橫排數字卡片」改為「垂直圓形燈號」
- 移除數字顯示，改以燈亮/熄滅表示是否有得分
- 每次值增加時觸發閃爍動畫（約 600ms），之後維持恆亮
- 燈號大小支援 RWD 自動縮放（sm/md/lg/xl 斷點）
- 標籤文字（P1/P2/P3）置於圓形燈的中央
- 無外框容器，三顆燈垂直排列

## Capabilities

### New Capabilities

（無新能力，此為既有顯示元件的視覺重構）

### Modified Capabilities

- `fighting-part-scoring`: P1/P2/P3 觀眾顯示的視覺呈現方式改為燈號，閃爍行為新增 effect() + setTimeout 驅動

## Impact

- 不涉及後端、Socket.IO 事件、資料模型、API 的任何變更
- 不引入新套件，純 CSS animation + Angular Signals 實作
- 受影響檔案：
  - `frontend/src/app/features/fighting-audience/fighting-audience.component.html`
  - `frontend/src/app/features/fighting-audience/fighting-audience.component.ts`
  - `frontend/src/styles.css`（若需新增 @keyframes flash 動畫）
