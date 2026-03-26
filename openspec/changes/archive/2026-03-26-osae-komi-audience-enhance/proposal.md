## Why

觀眾端對打畫面的 OSAE KOMI（押え込み）顯示目前以小型 badge 形式內嵌在選手姓名旁，字體僅 `text-2xl`（桌面 `text-3xl`），在觀眾席遠距離觀看時幾乎無法辨識倒數秒數。此外，缺乏視覺化的倒數進度指示，觀眾無法直覺感受剩餘時間；歸零音效也因未設定音量而過於微弱。

## What Changes

- **OSAE KOMI 顯示位置重構**：從選手姓名旁的 inline badge 移至姓名區與成績卡（WAZA-ARI / SHIDO）之間的獨立區塊，作為 flex 中間元素呈現
- **字體放大約 3 倍**：計時器從 `text-2xl md:text-3xl` 放大至 `text-6xl md:text-8xl`；標籤從 `text-sm md:text-base` 放大至 `text-xl md:text-2xl`
- **新增 15 格倒數進度條**：在 OSAE KOMI 計時器下方顯示 15 格方塊，每秒減少 1 格，從亮黃色漸變為暗色，讓觀眾一眼掌握剩餘時間
- **音效音量最大化**：歸零音效 `bell-short.mp3` 播放時設定 `audio.volume = 1.0`

## Non-Goals

- 不更動 OSAE KOMI 的後端邏輯或 Socket.IO 事件格式（`osae-komi:started` / `osae-komi:ended` payload 不變）
- 不修改裁判端的 OSAE KOMI 操作介面
- 不更換音效檔案（僅調整播放音量）
- 不更動 OSAE KOMI 的預設倒數時長（15 秒）

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `match-audience-display`：OSAE KOMI 顯示位置、尺寸、進度條視覺與音效音量的 UI 增強

## Impact

- 受影響程式碼：
  - `frontend/src/app/features/fighting-audience/fighting-audience.component.html`（模板重構 OSAE KOMI 區塊位置與樣式）
  - `frontend/src/app/features/fighting-audience/fighting-audience.component.ts`（新增進度條 signal 邏輯、音效音量設定）
  - `frontend/src/styles.css`（若需新增進度條動畫 keyframe）
- 不涉及後端、資料庫或 API 變更
- 不引入新套件，對 bundle 大小無影響
