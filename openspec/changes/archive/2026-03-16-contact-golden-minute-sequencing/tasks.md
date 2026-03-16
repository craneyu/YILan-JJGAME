## 1. 以 `timerNaturallyEnded` Signal 區分自然結束與手動操作（Referee can trigger golden minute up to twice）

- [x] 1.1 實作「Referee can trigger golden minute up to twice」時序限制：在 `contact-referee.component.ts` 新增 `timerNaturallyEnded = signal(false)` Signal
- [x] 1.2 修改 `startTimer()` 方法：在 setInterval 倒數到 0 時（`v <= 1`）自動設 `timerNaturallyEnded.set(true)`；在方法開始時設 `timerNaturallyEnded.set(false)`
- [x] 1.3 更新 `canGoldenMinute` 計算式加入 `timerNaturallyEnded()` 條件：`goldenMinuteCount() < 2 && timerNaturallyEnded()`
- [x] 1.4 在 `triggerGoldenMinute()` 觸發後重置 `timerNaturallyEnded.set(false)`
- [x] 1.5 在 `resetAllCounts()` 中重置 `timerNaturallyEnded.set(false)`

## 2. 計時微調按鈕放置於計時顯示區域（Referee can fine-adjust the match timer while paused）

- [x] 2.1 實作「Referee can fine-adjust the match timer while paused」：在 `contact-referee.component.ts` 新增 `adjustTimer(delta: number)` 方法，更新 `timerRemaining`（最小值 0）並重置 `timerNaturallyEnded.set(false)`
- [x] 2.2 在 `contact-referee.component.html` 計時器顯示區域旁加入四個微調按鈕（-10s / -1s / +1s / +10s），使用 `.glass-btn text-xs` 樣式
- [x] 2.3 微調按鈕須在 `timerRunning()` 或 `declaredWinner()` 時禁用（`[disabled]` 與 `opacity-30`）

## 3. 驗收確認

- [x] 3.1 驗證：比賽計時進行中，黃金分鐘按鈕保持禁用
- [x] 3.2 驗證：手動調整計時器至 0，黃金分鐘按鈕仍禁用（timerNaturallyEnded = false）
- [x] 3.3 驗證：主計時 3 分鐘自然結束後，黃金分鐘按鈕啟用
- [x] 3.4 驗證：第 1 次黃金分鐘觸發後，計時器重設為 60 秒，黃金分鐘按鈕再次禁用
- [x] 3.5 驗證：60 秒自然結束後，第 2 次黃金分鐘按鈕啟用；第 2 次觸發後按鈕永久禁用
- [x] 3.6 驗證：微調按鈕在計時進行中禁用，暫停時可用
