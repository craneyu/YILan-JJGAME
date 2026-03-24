## Context

三個對戰型觀眾端元件（contact-audience、fighting-audience、ne-waza-audience）各自擁有本地倒數計時器（`timerRemaining` signal），計時器歸零時僅有視覺回饋，無聲音提示。格鬥觀眾端另有壓制計時（OSAE KOMI，`redOsaeKomiRemaining` / `blueOsaeKomiRemaining`）。

目前三個元件皆已實作全螢幕按鈕，使用者點擊後瀏覽器會記錄 user gesture，滿足自動播放音效的前提條件。

## Goals / Non-Goals

**Goals:**

- 主計時器（對打 180s、格鬥可變、寢技可變）歸零時播放長鈴聲
- 壓制計時（格鬥 OSAE KOMI 15s）歸零時播放短音
- 音效可靠觸發，不因重複歸零而疊加播放

**Non-Goals:**

- 不加入傷停計時歸零音效
- 不加入裁判端音效
- 不建立獨立 AudioService 或共用模組
- 不處理瀏覽器自動播放限制的額外 UI 提示

## Decisions

### 使用 HTMLAudioElement 播放音效

使用瀏覽器原生 `new Audio(src)` 播放，不使用 Web Audio API。

**理由**：只需播放單一音檔，不需要混音、頻率控制等進階功能。HTMLAudioElement API 最簡單，且所有現代瀏覽器皆支援。

**替代方案**：Web Audio API 提供更精細的控制（音量、疊加、延遲），但對本需求而言過度設計。

### 使用 effect() 偵測歸零時機

在各觀眾端元件中，用 Angular `effect()` 監聽 `timerRemaining` signal，透過 `previousValue` 比較判斷是否從 >0 降至 0。

**理由**：元件已大量使用 Signals，effect() 是最自然的反應式觸發方式。用 `previousValue` 變數可確保只在「轉變瞬間」播放，避免重複觸發。

**替代方案**：在 `setInterval` 回呼裡直接呼叫播放——可行但分散在多處，較難維護。

### 音效檔作為靜態資源

將 `.mp3` 檔放在 `frontend/src/assets/sounds/`，由 Angular build 自動複製到 `dist/`。

**理由**：無需任何建置配置變更，Angular 預設會複製 `assets/` 目錄。Docker 部署也會自動包含。

## Risks / Trade-offs

- **[瀏覽器自動播放限制]** → 觀眾端使用者通常會先點擊全螢幕按鈕，提供所需的 user gesture。若未互動過，`play()` 會被靜默忽略（不會報錯中斷程式），可接受。
- **[音效檔大小]** → MP3 格式，預估每個檔案 < 50KB，不影響載入效能。
- **[計時器同步誤差]** → 觀眾端計時器為本地倒數（每秒 -1），與裁判端可能有 ±1 秒誤差。鈴聲在觀眾端本地歸零時觸發，此行為可接受。
