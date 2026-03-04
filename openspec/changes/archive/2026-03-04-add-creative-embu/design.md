# Design: add-creative-embu

## Context

現有系統只支援「雙人演武」一種比賽模式，採用 3-series（A/B/C）× 整數評分（0–3分）× 5 位裁判的架構。「創意演武」擁有完全不同的評分維度（技術分＋表演分各自獨立評分、0–9.5 分 0.5 間隔）以及計時功能，因此需要獨立的資料模型與流程，而非修改現有模型。

兩種比賽模式需要共用：使用者帳號、登入機制、event/team 管理、JWT 授權、Socket.IO 房間廣播基礎設施。

## Goals / Non-Goals

**Goals:**

- 登入畫面新增「比賽項目」Card 選擇，讓使用者在登入前先選擇 `kata`（雙人演武）或 `creative`（創意演武）
- 完整實作創意演武評分流程：5 位裁判各自獨立提交技術分（0–9.5，0.5 間隔）與表演分（0–9.5，0.5 間隔）
- 計算方式：技術分與表演分**分別**套用「去最高分＋最低分，取中間 3 位加總」，再合計為大總分（最高 57 分）
- 賽序裁判計時功能：開始/停止，觀眾畫面即時顯示
- 賽序裁判違例扣分標記（超時、未達時間、道具超量、攻擊次數不足）
- 分組排名顯示（男子組/女子組/混合組）
- 管理員後台可建立創意演武事件、匯入隊伍、查看排名、匯出 PDF/Excel

**Non-Goals:**

- 不修改現有雙人演武的任何資料模型或計分邏輯
- 不支援同一個 event 混合兩種比賽模式
- 不實作視訊重播或進階分析功能
- 不支援超過 5 位裁判

## Decisions

### 以 competitionType 欄位區分 Event 類型

在 `/events` 資料模型中新增 `competitionType: 'kata' | 'creative'`（required，無預設值）。現有 kata events 在新增欄位後補上預設值 `'kata'`。

**為何不用獨立 Collection？** kata 和 creative 共用 event 生命週期（name/date/venue/status/categoryOrder）、team 結構（name/members/category）、user 帳號，拆開 collection 會重複這些欄位，且造成 team 無法確定歸屬。

**替代方案考慮**：使用子文件（embedded doc）— 被否決，因為兩種類型的 event 欄位幾乎一致。

### 創意演武獨立 Score Collection

新增 `/creative_scores` collection（不修改現有 `/scores`），欄位：
- `eventId`, `teamId`, `judgeId`, `judgeNo(1–5)`, `technicalScore: Number(0–9.5, step 0.5)`, `artisticScore: Number(0–9.5, step 0.5)`, `submittedAt: Date`

Unique Index：`{ eventId, teamId, judgeId }`（每位裁判對每隊只有一份評分）

**為何分開？** 現有 `/scores` 綁定 `actionNo`（動作編號）和 `items`（4–5個0–3整數）結構，與創意演武的「整體評分一次性提交」完全不同，強行合併會造成大量 nullable 欄位，破壞 Model 語意。

### 違例扣分 Collection

新增 `/creative_penalties` collection：
- `eventId`, `teamId`, `penaltyType: 'overtime' | 'undertime' | 'props' | 'attacks'`, `deduction: Number`, `markedAt: Date`

允許同一隊多筆（可同時有多種違例），需先清空再重設。Unique Index：`{ eventId, teamId, penaltyType }`。

### 計時狀態放入 creative_game_states

新增 `/creative_game_states` collection（不修改現有 `/game_states`）：
- `eventId`（unique）、`currentTeamId?`、`timerStartedAt?: Date`、`timerStoppedAt?: Date`、`timerElapsedMs?: Number`、`status: 'idle' | 'scoring_open' | 'timer_running' | 'timer_stopped' | 'scores_collected' | 'complete'`

Socket.IO 事件（broadcast 至 `eventId` 房間）：
```typescript
interface TimerStarted { eventId: string; startedAt: string; }
interface TimerStopped { eventId: string; elapsedMs: number; }
interface CreativeScoreSubmitted { eventId: string; teamId: string; judgeNo: number; }
interface CreativeScoreCalculated {
  eventId: string; teamId: string;
  technicalTotal: number; artisticTotal: number; grandTotal: number;
  penaltyDeduction: number; finalScore: number;
}
interface PenaltyUpdated { eventId: string; teamId: string; penalties: PenaltyItem[]; }
```

### 前端路由分流設計

登入流程改為兩步：
1. 選擇比賽類型（Card 選擇頁）
2. 輸入帳號密碼 + 已選類型 POST `/api/v1/auth/login`

JWT payload 不需修改（roles 保持一致），但前端 localStorage 額外儲存 `competitionType`，路由守衛依此分流至 `/kata/*` 或 `/creative/*`。

**現有路由保持不變**，`/judge/*`、`/audience`、`/admin` 等現有路徑繼續服務雙人演武，新增 `/creative/*` 路徑服務創意演武。

### 評分按鈕：9 宮格整數＋小數切換

0–9.5 分共 20 個有效值（0, 0.5, 1.0 ... 9.0, 9.5）。UI 拆成兩個獨立控制元件：

1. **整數宮格**：3×3 方格顯示數字 1–9，第 10 格（左下）顯示 0。點擊即選取整數位。使用 `.score-btn-selected`（選中）/ `.score-btn-unselected`（未選中）既有 class。
2. **小數切換按鈕**：單一按鈕，點一次從 `.0` 切換為 `.5`，再點切換回 `.0`。預設 `.0`。每次點擊整數宮格後小數位**不重置**（保留使用者上次設定）。

完整分數 = 整數 + 小數（例：整數選 9，小數為 .5 → 分數為 9.5；整數 9 + 小數 .0 → 分數為 9.0）。有效範圍 0.0–9.5。

**未選整數時**送出按鈕維持 `.disabled-btn`；整數已選（含 0）則啟用。不引入新 UI 套件。

## Risks / Trade-offs

- **事件類型遷移**：現有 kata events 缺少 `competitionType` 欄位 → 啟動時透過 migration script 補上 `'kata'` 預設值，或在後端 controller 讀取時以 `?? 'kata'` fallback 處理
- **Bundle 大小**：新增 3 個創意演武頁面元件，預估增加 ~60–80kB，仍低於 500kB 警告線
- **計時精準度**：前端依賴 `Date.now()` 與 Socket.IO broadcast 計算，LAN 環境延遲 < 10ms，精確度足夠；不做高精度伺服器計時
- **同一裁判重複提交**：Unique Index 保護，controller 回傳 409 並提示重送
