## Why

主計時相關有兩個現場 bug：
1. 裁判透過 `PATCH /api/v1/match-scores/duration` 設定/變更比賽時長後，觀眾端必須等到裁判按「開始計時」才會看到新時長，導致開賽前或加時時段觀眾顯示的數字與現場主持人喊的不一致。
2. 場次切換的瞬間，`timerRemaining` 信號會經歷 `>0 → 0 → 新時長` 的中間狀態，誤觸 audience 端鈴聲 effect 條件 `previousTimerValue > 0 && current === 0`，導致進入下一場時鈴聲誤響。

兩個 bug 都會在實際賽事使用時造成觀眾困惑與裁判混淆，必須修正。

## What Changes

- 後端 `setDuration`（`backend/src/controllers/matchScoreController.ts`）成功設定時長後，新增 socket 廣播 `match:timer-updated`，payload：`{ matchId, remaining: duration, paused: true, durationSec: duration }`，沿用既有的 `broadcast.matchTimerUpdated` helper。
- audience 端鈴聲 guard：`ne-waza-audience`、`fighting-audience`、`contact-audience`、`match-audience` 元件在 `activeMatch` 切換或 `match:ended` 事件抵達時，將 `previousTimerValue` 重設為 `-1`，避免「上一場結束的 0」與「新場初始的 0」誤觸鈴聲條件。
- 不變更既有 `match:timer-updated` 事件介面，只是新增一個觸發來源。

## Non-Goals

- 不修改 `timer-started`、`timer-stopped`、`timer-adjust` 既有廣播（已正常運作）。
- 不重構鈴聲 effect 邏輯為新的狀態機，僅補 guard。
- 不處理計分歸零、結束比賽後返回列表等其他 UX 議題（屬於 `match-list-completion-ux` proposal）。
- 不新增鈴聲音檔或調整音量。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `fighting-timer-setup`: 設定 `matchDuration` 後 SHALL 廣播 `match:timer-updated`，讓觀眾端立即同步顯示新時長。
- `audience-timer-bell`: 鈴聲規則新增 guard — 場次切換或場次結束時 SHALL 重設 `previousTimerValue` 以避免誤觸鈴聲，且鈴聲 SHALL NOT 在切換 `activeMatch` 期間因 `timerRemaining` 路過 0 而觸發。

## Impact

- Affected specs: `fighting-timer-setup`、`audience-timer-bell`
- Affected code:
  - Modified:
    - backend/src/controllers/matchScoreController.ts
    - frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.ts
    - frontend/src/app/features/fighting-audience/fighting-audience.component.ts
    - frontend/src/app/features/contact-audience/contact-audience.component.ts
    - frontend/src/app/features/match-audience/match-audience.component.ts
  - New: (none)
  - Removed: (none)

### Socket.IO 廣播

新增觸發來源（事件本身既存）：
```ts
// 由 PATCH /api/v1/match-scores/duration 觸發
io.to(eventId).emit("match:timer-updated", {
  matchId: string;
  remaining: number;     // = 設定的 duration（秒）
  paused: true;          // 設定時長時計時器尚未啟動
  durationSec: number;   // = 設定的 duration（秒）
});
```

### 角色與授權

- 不變更角色定義，沿用 `setDuration` 既有的 `match_referee`、`admin` 權限。
