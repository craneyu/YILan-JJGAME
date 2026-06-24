## 1. 後端 setDuration 廣播（實作 Requirement: Duration confirmed via API before countdown starts）

- [x] 1.1 實作 Requirement「Duration confirmed via API before countdown starts」的新增廣播行為：在 `backend/src/controllers/matchScoreController.ts` 的 `setDuration` 函式內、`match.save()` 成功之後、`res.json` 之前，呼叫 `broadcast.matchTimerUpdated(eventId, { matchId, remaining: duration, paused: true, durationSec: duration })`；驗證：手動跑 `curl PATCH /api/v1/match-scores/duration`（帶 admin JWT 與 `{ matchId, duration: 180 }`），同時觀察觀眾端瀏覽器 DevTools 的 WebSocket frame 出現 `match:timer-updated` 並 payload 對應，且觀眾頁顯示由舊值跳為 `03:00`
- [x] 1.2 確認 `backend/src/sockets/index.ts` 已匯出 `broadcast.matchTimerUpdated` helper（既存於 line 227 區段）可直接呼叫，無需新增 helper；驗證：`grep -n "matchTimerUpdated" backend/src/sockets/index.ts` 顯示既有匯出，且 `setDuration` 的 import 可解析

## 2. Audience 鈴聲 guard 修正（實作 Requirement: Main timer bell on zero）

- [x] 2.1 [P] 為 Requirement「Main timer bell on zero」實作切場 guard：在 `frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.ts` 內，於 `activeMatch` 切換時（例如新增一個 watcher 或在 `loadActiveMatch` 函式呼叫成功處）、以及 `socket.matchEnded$` 訂閱 callback 內，將 `this.previousTimerValue = -1`，使得隨後 `timerRemaining` 經歷 `180 → 0 → 180` 的中間 0 不再觸發 `timerBellEffect` 內的鈴聲條件；驗證：手動在裁判端結束 A 場、開啟 B 場（兩場 duration 皆 180），觀察 ne-waza-audience 切場時無 `bell-long.mp3` 播放（透過瀏覽器 DevTools Console 加 log 或聽現場音）
- [x] 2.2 [P] 在 `frontend/src/app/features/fighting-audience/fighting-audience.component.ts` 套用相同 guard：切換 `activeMatch` 與接收 `match:ended` 時重設 `previousTimerValue = -1`；驗證：手動測試 fighting 場次切換無誤響
- [x] 2.3 [P] 在 `frontend/src/app/features/contact-audience/contact-audience.component.ts` 套用相同 guard；驗證：手動測試 contact 場次切換無誤響
- [x] 2.4 [P] 在 `frontend/src/app/features/match-audience/match-audience.component.ts` 套用相同 guard（含 ne-waza/fighting/contact 三種 matchType 切換情境）；驗證：手動測試三種 matchType 切換無誤響
- [x] 2.5 自然倒數鈴聲行為保持不變：以 ne-waza-audience 為樣本，手動啟動計時、待倒數至 0，確認鈴聲仍正常播放（防止 guard 過度抑制）

## 3. 驗收

- [x] 3.1 後端 ts-node 重啟後，`PATCH /api/v1/match-scores/duration` 變更 duration 時，觀眾端立即顯示新時長且 `paused: true`（從 audience 視角看時間靜止在新值）
- [x] 3.2 連續切換 3 場以上場次（含 bye match），無任何一場切換瞬間誤響鈴聲
- [x] 3.3 中途裁判判勝（`match:ended` 廣播）時，鈴聲不響；該場切到下一場時，亦不響
