## Why

目前三個對戰型觀眾端畫面（對打 contact-audience、格鬥 fighting-audience、寢技 ne-waza-audience）的計時器歸零時**僅有視覺回饋**，在比賽現場嘈雜環境下容易被忽略。加入鈴聲警示可讓裁判、選手與觀眾即時感知計時結束，提升比賽流程的清晰度與專業性。

## What Changes

- 新增兩個音效檔案至前端 `assets/sounds/`：
  - `bell-long.mp3`：主計時器歸零用（長鈴）
  - `bell-short.mp3`：壓制計時歸零用（短音）
- 在 **contact-audience**、**fighting-audience**、**ne-waza-audience** 三個觀眾端元件中，偵測主計時器 `timerRemaining` 從 >0 降至 0 時播放 `bell-long.mp3`
- 在 **fighting-audience** 元件中，偵測壓制計時 `redOsaeKomiRemaining` 或 `blueOsaeKomiRemaining` 從 >0 降至 0 時播放 `bell-short.mp3`
- 使用瀏覽器原生 `HTMLAudioElement` 播放，不引入額外套件

### Non-goals（不做什麼）

- 不加入傷停計時歸零的音效
- 不加入裁判端的音效（僅觀眾端）
- 不建立獨立的 AudioService——邏輯足夠簡單，直接在元件內處理
- 不處理瀏覽器自動播放政策的額外 UI 提示（觀眾端通常已透過全螢幕按鈕完成使用者互動）

## Capabilities

### New Capabilities

- `audience-timer-bell`: 觀眾端計時器歸零時播放鈴聲警示（主計時用長鈴、壓制計時用短音）

### Modified Capabilities

（無）

## Impact

- 受影響的程式碼：
  - `frontend/src/app/features/contact-audience/contact-audience.component.ts`
  - `frontend/src/app/features/fighting-audience/fighting-audience.component.ts`
  - `frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.ts`
- 新增靜態資源：
  - `frontend/src/assets/sounds/bell-long.mp3`
  - `frontend/src/assets/sounds/bell-short.mp3`
- 不涉及 Socket.IO 事件新增或修改
- 不涉及後端變更、資料模型變更、認證/角色變更
- 不引入新 npm 套件，對 bundle 大小無影響（音效檔為靜態資源，不計入 initial bundle）
