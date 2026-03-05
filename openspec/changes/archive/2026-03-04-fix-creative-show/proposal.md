## Why

創意演武（Show）賽序裁判介面與觀眾端存在多項計時錯誤、即時更新缺失及操作體驗問題，導致現場比賽流程受阻。需一次性修正計時器、隊伍選擇、分數即時顯示及觀眾端同步等問題，確保賽事正常進行。

## What Changes

- **計時器修正**：修正啟動後顯示 `NaN:NaN` 的問題；修正計時不即時更新的問題；加入暫停後繼續計時功能；新增計時歸零按鈕
- **計時器顯示強化**：計時畫面即時顯示當前組別（category）、隊伍名稱、參賽者名稱，跟隨賽序裁判選組變動即時更新
- **隊伍選擇重排**：賽序裁判隊伍列表依「組別分類（category）→ 組內場次序（order）」排列，方便快速定位
- **賽序裁判即時計分回饋**：計分裁判送出分數後，賽序裁判計時畫面下方即時顯示計算結果（技術分、表演分、違例扣分、最終分）
- **觀眾端即時更新**：觀眾端即時顯示計分結果（技術分、表演分、違例項目與扣分）及當前隊伍/參賽者名稱，不需重整頁面

## Capabilities

### New Capabilities

- `creative-show-timer-ux`: 計時器暫停/繼續/歸零操作，以及計時畫面內嵌顯示當前隊伍資訊（組別、隊伍名、參賽者）
- `creative-show-score-display`: 賽序裁判畫面計分結果即時顯示（接收 `creative:score:calculated` 廣播後更新）

### Modified Capabilities

- `creative-embu-timer`: 修正 NaN:NaN bug（timerStartedAt 解析問題）；修正即時計時更新邏輯；變更 timer_paused 狀態支援暫停後繼續
- `creative-embu-flow`: 隊伍選擇列表排序規則變更為 category → order 分組排列
- `creative-embu-scoring`: 計算結果廣播需包含 teamId、違例明細，確保賽序裁判與觀眾端可正確消費

## Impact

- Affected specs: `creative-embu-timer`, `creative-embu-flow`, `creative-embu-scoring`（修改需求）；`creative-show-timer-ux`, `creative-show-score-display`（新增）
- Affected code:
  - `frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts`
  - `frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html`
  - `frontend/src/app/features/creative-audience/creative-audience.component.ts`
  - `frontend/src/app/features/creative-audience/creative-audience.component.html`
  - `backend/src/sockets/index.ts`（確認 creative:score:calculated 廣播 payload）
  - `backend/src/controllers/creativeScoreController.ts`（廣播 payload 補充 teamId、penalties）
