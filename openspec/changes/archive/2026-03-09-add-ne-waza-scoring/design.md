# Design: add-ne-waza-scoring

## Context

現有系統已支援演武（Creative Embu）計分，採用 Event → Team → Score 的資料架構，並以 Socket.IO 房間廣播同步狀態。柔術賽制（寢技 Ne-Waza、對打 Fighting、格鬥 Contact）為**完全獨立的賽事類型**，採單淘汰制，1 名 `match_referee` 一人操作計時、計分與判決，不與演武系統共用資料模型或 Socket 事件。

## Goals / Non-Goals

**Goals**

- 新增 `match_referee` 角色，可選取場次並進行寢技計分
- 支援 Admin 匯入賽程（CSV/Excel）
- 即時同步計分至 `match-audience` 公開計分板
- 已完成場次鎖定，防止誤觸

**Non-Goals**

- 本 change 不實作對打（Fighting）和格鬥（Contact）計分介面（後續 change 處理）
- 不實作籤表視覺化（bracket visualization），進階功能另立 change
- 不修改演武計分現有資料或介面

## Decisions

### 新資料模型：Match 與 MatchScore 獨立於演武系統

**決策**：建立全新的 `/matches` 與 `/match_score_logs` collection，不重用 `/scores`。

**理由**：演武 `/scores` 設計為「5 位裁判投票取中間 3 位」的演算法，柔術是「1 人即時點擊記錄每筆得分動作」，資料結構根本不同。混用會造成 schema 污染與計分邏輯衝突。

**Match schema**：

```
{
  eventId: ObjectId,           // 所屬賽事
  matchType: 'ne-waza' | 'fighting' | 'contact',
  category: 'male' | 'female' | 'mixed',
  weightClass: String,         // '-62kg' 等
  round: Number,               // 1=預賽, 2=準決賽, 3=決賽
  matchNo: Number,             // 同輪場次編號
  redPlayer:  { name: String, teamName: String },
  bluePlayer: { name: String, teamName: String },
  status: 'pending' | 'in-progress' | 'completed',
  result?: { winner: 'red' | 'blue', method: 'judge' | 'submission' | 'dq' },
  isBye: Boolean,              // 輪空場次
  scheduledOrder: Number,      // 賽程排列順序
  createdAt: Date
}
```

**MatchScoreLog schema**（每筆操作記錄）：

```
{
  matchId: ObjectId,
  side: 'red' | 'blue',
  type: 'score' | 'advantage' | 'warning' | 'submission' | 'undo',
  value: Number,               // score: 2/3/4, advantage: 1, warning: 1, undo: -1
  timestamp: Date
}
```

計算即時得分時：從 logs 重算（score 加總 + undo 扣除），不存 aggregate 欄位，避免不一致。

---

### Socket.IO 房間策略：沿用 eventId 房間廣播

**決策**：match_referee 與 match-audience 都 join `eventId` 房間，事件名前綴 `match:` 與演武事件區隔。

**理由**：不引入額外的房間層級，與現有架構一致，不需修改 SocketService 的房間管理邏輯。

**事件清單**：

- `match:score-updated` → `{ matchId, side, scores, advantages, warnings }`
- `match:timer-updated` → `{ matchId, remaining, paused }`
- `match:ended` → `{ matchId, winner, method }`

計時器由**前端 match-referee 元件負責倒數**，每秒 emit `match:timer-updated`，audience 端接收同步顯示。這樣避免後端維護每場計時器狀態。

---

### match_referee 前端：單一元件兩種視圖（列表 / 計分）

**決策**：`match-referee` 元件內以 Signal `view: 'list' | 'scoring'` 切換，不拆成兩個路由。

**理由**：計分中途不能讓裁判誤觸瀏覽器上一頁跳走；單元件可完整控制導航鎖定，且狀態共享更簡單。

**State signals**：

```typescript
view = signal<"list" | "scoring">("list");
matches = signal<Match[]>([]);
activeMatch = signal<Match | null>(null);
redScore = signal(0);
blueScore = signal(0);
redAdvantage = signal(0);
blueAdvantage = signal(0);
redWarnings = signal(0);
blueWarnings = signal(0);
timerRunning = signal(false);
timerRemaining = signal(0); // seconds
scoreLog = signal<ScoreLogEntry[]>([]); // for undo
injuryTimerActive = signal(false);
injuryRemaining = signal(120); // 2 min
```

---

### 警告累計規則由前端處理，後端僅記錄

**決策**：警告到 2/3/4 次的自動優勢與自動判負邏輯在前端 `computed()` 中計算，後端只儲存 log。

**理由**：規則僅影響 UI 顯示與即時 socket broadcast，不需要後端知道「累計 3 警告=對方優勢」。比賽過程中若裁判誤觸 [-警告] 撤回，前端 undo 即可，後端 log 正確反映操作歷史就夠了。

---

### Admin 匯入賽程：沿用現有 XLSX 解析模式

**決策**：重用 Admin 元件的 `papaparse`/XLSX 匯入 UI 模式（現有 CSV/Excel 匯入已有範例），新增「匯入寢技賽程」按鈕，POST 到 `/api/v1/matches/bulk`。

**格式（CSV 欄位）**：

```
項目, 組別, 量級, 回合, 場次序, 紅方姓名, 紅方隊名, 藍方姓名, 藍方隊名
ne-waza, male, -62kg, 1, 1, 張三, A隊, 李四, B隊
```

## Risks / Trade-offs

- **計時器前端驅動** → 若裁判重新整理頁面，計時器會重置。緩解：進入計分畫面時 API 取回 `match.status`，若為 `in-progress` 則提示「此場次進行中，是否繼續？」並允許手動輸入剩餘時間。
- **已完成場次鎖定** → 若需修正成績只能找 Admin。這是刻意設計（防誤觸 > 方便性），可接受。
- **無 bracket 視覺化** → 裁判靠列表選場次，排序依 `scheduledOrder`，清晰但不直觀。後續 change 補充。

## Migration Plan

1. 後端先部署（新 routes/models，不改現有）
2. 新增 `match_referee` seed 帳號（`npm run seed` 或手動執行 `initialUsers.ts`）
3. 前端新增路由與元件（不改現有路由）
4. Admin 後台新增「柔術賽程」匯入區塊

Rollback：刪除新 routes 和前端元件，seed 帳號不影響演武功能。

## Open Questions

- (已決定) 公開計分板需要嗎？→ 需要（`match-audience`）
- (已決定) 裁判選場次還是 Admin 推送？→ 裁判自選
- (已決定) 已完成場次可重進？→ 不可，鎖定
- 傷停 2 分鐘計時器應不應該也廣播給 audience 端？→ 建議不廣播，保持 audience 畫面簡潔，僅顯示主計時器暫停中
