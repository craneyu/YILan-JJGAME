## Why

目前格鬥計分板的黃金分鐘按鈕僅以次數（< 2）做為啟用條件，裁判可在比賽計時進行中或手動將計時器調整至 0 後立即觸發黃金分鐘，不符合規則要求「主計時必須自然結束後才可進入黃金分鐘」的時序限制。此外，計分介面缺乏計時微調功能，裁判無法在暫停狀態下修正秒數。

## What Changes

- **黃金分鐘啟動條件加強**：黃金分鐘按鈕只在計時器「自然倒數至 0」後才啟用；手動暫停或手動調整計時器至 0 不觸發此條件
- **第二次黃金分鐘序列限制**：第二次黃金分鐘只在第一次黃金分鐘（60 秒）自然結束後才可觸發
- **計時微調按鈕**：在計時器暫停狀態下提供 +10s / +1s / -1s / -10s 四個微調按鈕；微調操作會重置「自然結束」旗標，確保按鈕不因手動歸零而誤開放黃金分鐘

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `contact-golden-minute`：新增黃金分鐘啟動必須依賴計時器自然結束的時序限制，以及計時微調按鈕的規格

## Impact

- 無新套件、無 Bundle 大小影響
- 無 Socket.IO 新事件（黃金分鐘觸發事件不變）
- 無後端變更
- 受影響檔案：
  - `frontend/src/app/features/contact-referee/contact-referee.component.ts`
  - `frontend/src/app/features/contact-referee/contact-referee.component.html`
