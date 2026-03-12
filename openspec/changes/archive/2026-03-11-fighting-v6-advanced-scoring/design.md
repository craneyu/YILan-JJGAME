## Context

現行 `match-referee` 裁判介面以單一「加減分」按鈕直接更新總分，缺少 PART 分區概念；`MatchScoreLog` 只記錄 action 類型與分數增減，無法追蹤 IPPON 次數；計時器在場次建立後立即開始倒數，無法於開賽前選擇時長；CHUI 中度犯規僅在前端狀態顯示，未寫入後端也未觸發自動 DQ。

本次變更涵蓋後端資料模型、Socket.IO 廣播、前端裁判介面與觀眾端顯示四個面向，屬跨模組異動。

## Goals / Non-Goals

**Goals:**

- PART 1/2/3 分區按鈕：各區獨立記錄得分與 IPPON 計數
- FULL IPPON 判定：三區 IPPON 各 ≥ 1 時強制勝出，後端處理並廣播
- CHUI 計數寫入後端，累積 2 個觸發自動 DQ 廣播
- 計時器開賽前時間選擇 modal（2 分 / 3 分快速選擇）
- 計時器暫停中微調面板（±1 秒 / ±10 秒 / ±1 分），操作記錄於 log
- 觀眾端顯示 FULL IPPON 覆蓋層、CHUI 徽章、PART 分數列

**Non-Goals:**

- 不新增新的角色或 JWT 欄位
- 不修改演武（Kata）計分模組
- 不實作 VR 回放功能（VR 按鈕 UI 保留，後端待後續版本）
- 不修改場次管理（Match 建立/刪除）邏輯

## Decisions

### PART 分區計分存入 MatchScoreLog

每次裁判操作（加分 / 減分）均寫入一筆 `MatchScoreLog`，新增欄位：
- `partIndex: 1 | 2 | 3 | null`（null = ALL PARTS 直接加減總分）
- `ippons: { p1: number, p2: number, p3: number }`（本次操作後的快照）

**為何不分三個欄位直接存分數**：IPPON 計數是「觸發次數的累計」而非分數，快照設計讓任意時刻都能重算，避免 FULL IPPON 判定依賴前後文。

### FULL IPPON 判定於後端 Controller

`matchScoreController.ts` 在每次 POST 操作後計算目前 IPPON 快照；若 p1 ≥ 1 && p2 ≥ 1 && p3 ≥ 1，後端將 Match 狀態設為 `full-ippon-pending`，**暫停計時**，廣播 `match:full-ippon` 事件（含 suggestedWinner）。Match 狀態**不**直接設為 `finished`——裁判仍需按 [紅方勝] / [藍方勝] 完成正式判決。

**為何不自動結束**：保留裁判宣判的法定程序；誤觸可在判決前撤銷分數。後端廣播只是「提示達成條件」，最終勝負仍由裁判操作觸發。

### CHUI 計數存入 Match 模型

CHUI **不**另設獨立計數器，折算為 SHIDO 單位（+CHUI = SHIDO +3）。`Match` 新增 `redShido: number` 與 `blueShido: number`（default: 0）統一紀錄。`+SHIDO` / `-SHIDO` / `+CHUI` / `-CHUI` 均呼叫 `POST /api/v1/matches/:id/foul`（payload: `{ side, type: 'shido'|'chui', delta: 1|-1 }`），後端換算 SHIDO 單位後更新，並同步寫入對手的 score 與 WAZA-ARI。SHIDO 計次 ≥ 6 時廣播 `match:shido-dq`（`suggestedWinner`），裁判仍須按 [紅方勝] / [藍方勝] 完成判決。

**為何統一 SHIDO 計次**：CHUI 在規則上等於 3 個 SHIDO，統一計次使 DQ 門檻（≥ 6）邏輯清晰，避免同時維護兩個計數器。

### 計時器設定以 matchDuration 存入 Match

`Match` 新增 `matchDuration: number`（秒，default: 180）。場次開始時前端顯示選擇 modal，確認後呼叫 `PATCH /api/v1/matches/:id/duration` 更新並回傳，前端才開始本地倒數。暫停微調後呼叫 `PATCH /api/v1/matches/:id/timer-adjust`（payload: `{ delta: number, remainingBefore: number }`），操作記錄於 `MatchScoreLog`（actionType: `timer-adjust`）。

**為何前端本地倒數而非後端計時**：LAN 環境延遲低，前端倒數夠精準；後端維護計時 ticker 複雜度高、重連時狀態同步困難。

### 觀眾端 FULL IPPON 覆蓋層

Socket 收到 `match:full-ippon` 時，觀眾端顯示全螢幕覆蓋層（`fixed inset-0 bg-black/80 z-50`），中央顯示 `FULL IPPON` 大字（`text-6xl font-black text-yellow-400`）與勝者名稱，持續顯示直到下一場次開始。

## Risks / Trade-offs

- [Risk] PART IPPON 快照與實際分數出現落差（例如 -3 使 IPPON -1 但總分變負）→ Controller 強制 IPPON 計數最低為 0；totalScore 允許短暫為負，前端顯示 0
- [Risk] 計時器 modal 阻塞開賽操作 → modal 為必填，不可跳過；若網路斷線，PATCH duration 失敗則顯示 Toast 錯誤，timer 不啟動
- [Risk] CHUI DQ 與手動裁判判決同時觸發 → 後端以先到達的操作為準，已 finished 的場次拒絕後續 CHUI 更新（回傳 409）
- [Trade-off] 新增 3 個 Socket 事件（`match:full-ippon`、`match:chui-dq`、`match:timer-adjusted`），觀眾端需處理更多事件分支，但換來前後端狀態一致性保證
