## Context

格鬥計分板（`contact-referee`）的計時器目前以 `timerRemaining = signal(180)` 管理 3 分鐘倒數。黃金分鐘按鈕的啟用條件只檢查 `goldenMinuteCount() < 2`，未限制計時器必須自然結束。

此外，計分介面沒有計時微調功能，裁判無法在暫停時補正誤差秒數。

## Goals / Non-Goals

**Goals:**
- 新增 `timerNaturallyEnded` Signal，確保黃金分鐘只能在計時器自然倒數至 0 後觸發
- 第二次黃金分鐘序列限制：第一次 60 秒自然結束後才可觸發第二次
- 新增計時微調按鈕（+10s / +1s / -1s / -10s），僅在計時器暫停時啟用
- 微調操作重置 `timerNaturallyEnded` 旗標，防止手動歸零誤開放黃金分鐘

**Non-Goals:**
- 後端資料模型變更（goldenMinuteCount 已存在）
- Socket.IO 新事件（觸發事件不變）
- 觀眾顯示頁調整

## Decisions

### 以 `timerNaturallyEnded` Signal 區分自然結束與手動操作

使用純前端 `timerNaturallyEnded = signal(false)` 旗標：

- **設為 `true`**：僅在 `setInterval` 回呼中 `v <= 1` 時（自然倒數到 0）
- **重置為 `false`**：
  - `startTimer()` 開始計時時
  - `adjustTimer(delta)` 手動微調時
  - `triggerGoldenMinute()` 觸發後（重置以等待下一次自然結束）

更新後的 `canGoldenMinute` 計算式：
```typescript
canGoldenMinute = computed(() =>
  this.goldenMinuteCount() < 2 && this.timerNaturallyEnded()
);
```

**替代方案（否決）**：檢查 `timerRemaining() === 0 && !timerRunning()`
- 手動將計時器調至 0 也會符合條件，無法滿足「自然結束」的要求

### 計時微調按鈕放置於計時顯示區域

在計時器顯示數字的上下方各放一排微調按鈕（-10s / -1s / +1s / +10s），使用 `.glass-btn` 樣式，僅在 `!timerRunning() && !declaredWinner()` 時啟用。

`adjustTimer(delta: number)` 方法：
```typescript
adjustTimer(delta: number): void {
  if (this.timerRunning()) return;
  this.timerNaturallyEnded.set(false);          // 重置旗標
  this.timerRemaining.update((v) => Math.max(0, v + delta));
}
```

## Risks / Trade-offs

- [Risk] 頁面重新整理後 `timerNaturallyEnded` 為 `false`（純前端 Signal，不持久化）→ 可接受；格鬥計分板本就不支援斷線重連恢復，需裁判手動調整
- [Trade-off] 微調按鈕增加 UI 元素密度 → 採用緊湊尺寸（`text-xs`）且僅在暫停時顯示，減少視覺干擾
