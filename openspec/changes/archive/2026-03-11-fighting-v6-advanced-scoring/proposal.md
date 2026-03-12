## Why

現行對打裁判介面缺少 SPEC-v6 所定義的進階計分功能：PART 分區計分與 IPPON 機制、FULL IPPON 強制勝出、CHUI 累積 DQ 判定、計時器開賽前設定與暫停中微調。這些功能是實際賽事運作不可缺少的規則執行環節，須在正式上線前完成。

## What Changes

- **PART 分區計分**：裁判介面新增 PART 1 / PART 2 / PART 3 三個分區按鈕組（各含 +2、+3、-2、-3），以及 ALL PARTS 直接加減總分按鈕（+1 / -1）
- **IPPON 計數**：每次 +2 或 +3 使該 PART 的 IPPON 計數 +1；-2 或 -3 則 -1（最低為 0）；三區各自 IPPON ≥ 1 時觸發 FULL IPPON
- **FULL IPPON 強制勝出**：觸發時總分強制設為 50，對手分數設為 0，觀眾端顯示「FULL IPPON」大字提示，場次自動結束
- **SHIDO/CHUI 犯規與累積 DQ**：+SHIDO 使該選手 SHIDO 計次 +1 並給予對手 +1 分 / +1 WAZA-ARI；+CHUI 折算 SHIDO +3 並給予對手 +3 分 / +3 WAZA-ARI；SHIDO 計次 ≥ 6 自動觸發 DQ，對手勝出；裁判介面及觀眾端顯示 SHIDO/CHUI 徽章
- **計時器開賽前設定**：場次開始前顯示時間選擇 modal（快速選擇 2 分 / 3 分），確認後才正式開始倒數
- **計時器暫停中微調**：比賽暫停時顯示時間調整面板（±1 秒、±10 秒、±1 分），提供「繼續比賽」與「儲存並繼續」兩個操作；調整操作記錄至場次 log

## Capabilities

### New Capabilities

- `fighting-part-scoring`: PART 1/2/3 分區按鈕計分、IPPON 計數邏輯與 ALL PARTS 總分加減
- `fighting-full-ippon`: 三 PART 各有 IPPON 時的 FULL IPPON 強制勝出機制（前後端邏輯 + 觀眾端顯示）
- `fighting-chui-dq`: SHIDO/CHUI 犯規計數（CHUI 折算 SHIDO×3）、WAZA-ARI 回寫對手、SHIDO 計次 ≥ 6 觸發自動 DQ、減分防負數回算
- `fighting-timer-setup`: 場次開始前計時器時間選擇（2 分 / 3 分快速選擇 modal）
- `fighting-timer-pause-adjust`: 暫停中計時微調面板（±秒 / ±分），含 log 記錄

### Modified Capabilities

- `match-scoring`: 新增 PART 分區欄位（part1Score/part2Score/part3Score、partIppon）、WAZA-ARI 計數、SHIDO 計數至 Match 模型；MatchScoreLog 新增 actionType / partIndex / ipponsSnapshot；減分防負數回算邏輯
- `match-audience-display`: 新增 FULL IPPON 大字覆蓋層、SHIDO/CHUI 徽章、PART 分數列、WAZA-ARI 計數顯示
- `referee-judge-decision-flow`: FULL IPPON 與 SHIDO DQ（計次 ≥ 6）達成條件時系統暫停計時並高亮提示，裁判仍須按 [紅方勝] / [藍方勝] 完成正式判決，不自動跳過

## Impact

- Affected specs: `match-scoring`（delta）、`match-audience-display`（delta）、`referee-judge-decision-flow`（delta）
- Affected code:
  - `backend/src/models/Match.ts` — 新增 CHUI 計數、matchDuration 欄位
  - `backend/src/models/MatchScoreLog.ts` — 新增 part1Score/part2Score/part3Score、partIppon 欄位
  - `backend/src/controllers/matchScoreController.ts` — IPPON 累計邏輯、FULL IPPON 判定、CHUI DQ 判定
  - `backend/src/sockets/index.ts` — 廣播 `match:full-ippon`、`match:chui-dq`、`match:timer-adjusted` 事件
  - `frontend/src/app/features/match-referee/match-referee.component.ts` — PART 按鈕、IPPON Signal、CHUI Signal、計時器 modal
  - `frontend/src/app/features/match-referee/match-referee.component.html` — PART 分區 UI、CHUI 徽章、計時器設定/微調 modal
  - `frontend/src/app/features/match-audience/match-audience.component.ts` — FULL IPPON 覆蓋層、CHUI 徽章、PART 分數列
  - `frontend/src/app/features/match-audience/match-audience.component.html` — 對應 UI 更新
