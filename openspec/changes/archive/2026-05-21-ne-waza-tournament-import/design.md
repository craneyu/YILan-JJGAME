## Context

寢技錦標賽（115 錦標賽）共 87 場、橫跨 7 個年齡分級、多個量級、含 12 場第 2 回合（含晉級依賴）。Excel 範本由賽務人員手動編製，需匯入後即可直接運行 — 不能要求賽務每場結束都手動回到 Excel 把「3勝」改成實際名字。

目前限制：

- 既有 `MatchTier` 為 4 級（`ELEM | JH | SH | OPEN`），ELEM 對應 Excel 三個不同年級的歧義；幼兒組無對應。
- Match schema 沒有「來源場次」概念，無法表達「紅方來自場次 3 勝者」這種延遲填入的依賴。
- 前端 match-management 匯入用 `i+1` 覆寫 matchNo，破壞「{N}勝」中 N 與 matchNo 的對應關係。
- Bye 場次（藍方空白）目前需照常開始比賽 + 計時器，浪費操作步驟。

關鍵設計挑戰：

1. Tier 重構是 BREAKING — 既有資料移除 `ELEM` 後可能無對應碼。
2. Propagation 邏輯必須在 `updateMatch` 內事務化處理，避免一場完賽後 socket 廣播與 DB 寫入不一致。
3. 一場可能被多個後續場次引用（同 matchNo 被 redSource 與 blueSource 各引用一次或不同場次各引一次）— propagation 要 update 多筆。
4. UI 上場次列表需區分「未 resolved 來源」（顯示 N 勝者灰字）與「已 resolved」（顯示實際姓名）。

## Goals / Non-Goals

**Goals:**

- Excel 一鍵匯入寢技 87 場完整賽程，含分級、量級、晉級佔位、bye。
- 完賽自動 propagate 勝者至所有引用此場的後續場次，無須人工編輯。
- Bye 場次裁判操作精簡至「直接按紅方勝」一步即完賽。
- 兼容既有 ne-waza-referee 比賽流程，不破壞既有計時、傷停、押制、Shido、Full-IPPON 流程。

**Non-Goals:**

- 不實作敗者組 / 雙敗淘汰 / 多階段交叉等複雜 bracket。
- 不向後相容 `A{N}勝` 舊格式。
- 不擴充對打、格鬥比賽匯入的中文分級對應。
- 不修改 ne-waza-audience 既有顯示邏輯與佈局。

## Decisions

### D1：MatchTier 擴充為 7 級，移除 ELEM

**選定**：`MatchTier = "KID" | "EL" | "EM" | "EH" | "JH" | "SH" | "OPEN"`。

**理由**：
- Excel 範本明確使用 7 個年齡分級，ELEM 是目前唯一的「合併碼」無法區分國小三個年級。
- 與 `Team.tier` 對齊（差別僅 Team 無 KID — 演武不分幼兒；寢技才有）。
- 移除 ELEM 比保留為 alias 更乾淨，避免後續維護兩套對應表。

**Alternatives 考慮**：
- (a) 保留 ELEM 為 alias 並新增 EL/EM/EH/KID — 拒絕：兩套 enum 互通須在每處 lookup 加 fallback 邏輯。
- (b) 新增獨立 `ageGroup` 字串欄位，tier 維持 4 級 — 拒絕：需要在排序、預設秒數、UI 顯示處同時讀兩欄，增加耦合與 bug 風險。

**Data migration**：seed 腳本 `migrateNeWazaTier.ts` 列出所有 `tier === "ELEM"` 的 Match documents 給管理員，由人工依選手年齡決定改為 `EL` / `EM` / `EH`（不自動 guess）。腳本提供 dry-run 模式。

### D2：晉級依賴用 redSource / blueSource 結構

**選定**：在 Match schema 新增兩個 optional 子物件：

```typescript
interface MatchSource {
  fromMatchNo: number;       // 引用的場次號（= Excel 場次序 = matchNo）
  resolved: boolean;         // 是否已 propagate 完成
}

interface IMatch extends Document {
  // ...existing fields...
  redSource?: MatchSource | null;
  blueSource?: MatchSource | null;
}
```

**理由**：
- 解析「3勝」字串時把 `fromMatchNo: 3` 寫進 schema，比把字串塞進 `redPlayer.name` 再 regex 解出來乾淨；明確語意可被 unique index 與 query 利用。
- `resolved` 旗標讓 propagation 冪等：同一場完賽多次也只 update 一次。
- redPlayer / bluePlayer 仍保留 placeholder 文字（例如 `name = "3 勝者"`，teamName = ""）給匯入直後的 UI 顯示，避免 player schema required:true 失敗。

**Alternatives 考慮**：
- (a) 字串解析 `redPlayer.name === "3勝"` 即時 join — 拒絕：每次讀取都得 regex，且無法表達「待 resolve」狀態。
- (b) 獨立 collection `match_dependencies` — 拒絕：1:1 隨 Match 生命週期的資料切到別處增加 query join 與一致性負擔。

### D3：Propagation 於 updateMatch 內同步觸發

**選定**：`matchController.updateMatch` 在偵測到 `match.status` 由非 completed 變為 `completed` 且 `match.result?.winner` 已設時，於同一 request handler 內：

1. 計算 winner name / teamName（依 result.winner 取 red 或 blue player）。
2. `Match.find({ eventId, $or: [{ "redSource.fromMatchNo": match.matchNo, "redSource.resolved": false }, { "blueSource.fromMatchNo": match.matchNo, "blueSource.resolved": false }] })`。
3. 對每筆找到的下游場次，依 redSource / blueSource 決定 update 的是 redPlayer 還是 bluePlayer，並設 `*.resolved = true`。
4. 為每筆 update 廣播一則 `match:advancement-resolved`。

**理由**：
- 完賽屬低頻事件（每場 90s~5min 才一次），同步 propagation 不影響效能。
- 在 same controller 處理確保 socket 廣播 / DB write 在同一 request 完成，UI 端不會看到「上一場顯示完賽 + 下一場仍是 placeholder」的中間態。
- 不引入 task queue / message bus 等架構複雜度。

**Alternatives 考慮**：
- (a) Mongoose post-save hook — 拒絕：hook 內無 req 物件，廣播需另外注入 socket instance，且 hook 觸發時機與 `req.body` 修改順序混淆。
- (b) 獨立排程 worker 掃描 completed 場次 — 拒絕：架構過度，且引入延遲。

### D4：匯入解析器抽到 utils/matchImport.ts

**選定**：新增 `backend/src/utils/matchImport.ts` 提供：

```typescript
type ImportRow = Record<string, string | number>;

interface ParsedMatch {
  matchType: "ne-waza";
  category: "male" | "female" | "mixed";
  tier: MatchTier;
  weightClass: string;
  round: number;
  matchNo: number;          // = scheduledOrder
  scheduledOrder: number;
  redPlayer: { name: string; teamName: string };
  bluePlayer: { name: string; teamName: string };
  redSource: MatchSource | null;
  blueSource: MatchSource | null;
  isBye: boolean;
}

function parseTierLabel(label: string): MatchTier | null;
function parsePlacementPlaceholder(name: string): number | null;   // "3勝" → 3
function parseMatchRow(row: ImportRow): ParsedMatch;
```

**理由**：
- 解析邏輯橫跨前後端（前端匯入時呼叫後端 bulkCreate）— 抽出後可在 controller 層 reuse / 寫單元測試。
- 「{N}勝」regex `^\s*(\d+)\s*勝\s*$`（嚴格匹配，不允許 A 前綴）。
- 中文分級對應表寫死於此 util，方便未來變更。

### D5：Bye 場次允許跳過計時直接判勝

**選定**：在 `ne-waza-referee` 元件的「紅方勝 / 藍方勝」按鈕 enable 條件加入：

```
isBye === true && status === "pending" && bluePlayer.name === ""
```

時，紅方勝按鈕直接 enabled，且按下後：

1. PATCH `/matches/:matchId` 直接帶 `status: "completed"`, `result: { winner: "red", method: "judge" }`。
2. 不需先 PATCH `status: "in-progress"`，不需啟動計時器。

後端 `updateMatch` 狀態機需放行 `pending → completed`（限 isBye 為 true 場次），且不寫 MatchScoreLog（因無比賽過程）。

**理由**：
- 賽務流程：bye 場次不打、只走形式判勝。
- 既有狀態機 `VALID_TRANSITIONS` 不允許 pending → completed，需新增條件式 exemption（限 isBye = true）。
- method 沿用 `'judge'` 不擴 walkover，依使用者最終決定。

**Alternatives 考慮**：
- (a) 新增 walkover method — 拒絕：使用者明確說不需要區分。
- (b) 匯入時就自動完賽 — 拒絕：使用者明確說要等裁判操作。

### D6：UI placeholder 渲染

**選定**：場次列表（match-management 與 ne-waza-referee 共用 helper）渲染選手姓名時：

```typescript
function displayPlayerName(player: { name: string; teamName: string }, source: MatchSource | null | undefined): { text: string; isPlaceholder: boolean } {
  if (source && !source.resolved) return { text: `${source.fromMatchNo} 勝者`, isPlaceholder: true };
  return { text: player.name, isPlaceholder: false };
}
```

Placeholder 套用 `text-white/40 italic` style 與正式姓名區分。

## Implementation Contract

### 行為（Observable Behaviour）

**匯入流程**：
- 管理員在 match-management 上傳 `寢技賽程匯入範本_*.xlsx` 後，後端解析 87 列、回傳成功 87 筆。
- 含「分級」欄位 7 種中文標籤皆能正確對應 tier code。
- 「3勝」「14勝」字串被解析為 redSource / blueSource，redPlayer.name 顯示為 `"3 勝者"`、teamName = ""。
- 藍方空白列：bluePlayer.name = ""、bluePlayer.teamName = ""、isBye = true、status = "pending"。
- 第 2 回合場次 round = 2，matchNo = Excel 場次序（76~87）。

**Propagation**：
- 任一場完賽（status: completed + result.winner 設定）後，所有 redSource.fromMatchNo === N 或 blueSource.fromMatchNo === N 的場次：對應 player.name / teamName 寫入 winner 資料、source.resolved = true。
- Socket.IO 廣播 `match:advancement-resolved`（payload 包含 matchId, side, playerName, teamName, fromMatchNo）。一場完賽若被 K 筆引用，廣播 K 次。
- 二次完賽（admin 強制 update 同一場）不重複 propagate（source.resolved 已是 true）。

**Bye 完賽**：
- 裁判進 isBye=true 場次：紅方勝按鈕直接 enabled。
- 按下後 PATCH /matches/:matchId 帶 status: completed + result: { winner: red, method: judge }。
- 後端狀態機放行 pending → completed（限 isBye = true）。
- 完成後同樣觸發 propagation。

### 介面 / 資料形狀（Interface / Data Shape）

**Match schema 變更**：
```typescript
type MatchTier = "KID" | "EL" | "EM" | "EH" | "JH" | "SH" | "OPEN";

interface MatchSource {
  fromMatchNo: number;     // 引用的場次號 (≥ 1)
  resolved: boolean;       // 是否已 propagate
}

interface IMatch extends Document {
  tier: MatchTier | null;            // enum 變更，預設 null 不變
  redSource?: MatchSource | null;    // 新增
  blueSource?: MatchSource | null;   // 新增
  // ... 其他欄位不變
}
```

**Socket 事件**：
```typescript
interface MatchAdvancementResolvedPayload {
  matchId: string;
  side: "red" | "blue";
  playerName: string;
  teamName: string;
  fromMatchNo: number;
}
broadcast.matchAdvancementResolved(eventId: string, payload: MatchAdvancementResolvedPayload): void;
```

**utils/matchImport.ts 出口**：
```typescript
export function parseTierLabel(label: string): MatchTier | null;
export function parsePlacementPlaceholder(name: string): number | null;
export function parseMatchRow(row: Record<string, string | number>): ParsedMatch | { error: string };
```

**utils/matchPropagation.ts 出口**：
```typescript
export async function propagateMatchWinner(args: {
  eventId: string;
  completedMatchNo: number;
  winnerName: string;
  winnerTeamName: string;
}): Promise<Array<{ matchId: string; side: "red" | "blue" }>>;
```

### 失敗模式（Failure Modes）

- 匯入 Excel 缺「分級」欄、欄值不在 7 標籤內 → 整列 reject，回傳該列號與錯誤訊息。
- 「{N}勝」格式錯誤（含 A 前綴、N 非正整數、N 不存在於本批次）→ 整列 reject 並提示「請改用「{N}勝」純數字格式」。
- 場次序重複 → 既有 `bulkCreateMatches` 重複偵測沿用，回 409。
- Propagation 對應的下游場次此時已被刪除 → 靜默忽略（不報錯，原因：完賽行為已成功）。
- 裁判試圖在 `isBye = false` 場次直接 pending → completed → 後端狀態機拒絕（409 不允許從 pending 轉移至 completed）。

### Acceptance 標準

- 上傳 `寢技賽程匯入範本_115錦標賽.xlsx` 一次成功匯入 87 場，無需手動修改 Excel。
- 場次列表顯示：場次 16 紅方顯示「3 勝者」灰字 placeholder；場次 3 完賽後場次 16 自動更新為實際勝者姓名 + 隊名。
- Bye 場次（如場次 1 藍方空白）裁判點開後可直接按紅方勝完賽，無需按開始比賽。
- 第 2 回合場次 76 完賽 propagation 後場次依賴鏈 resolved；連鎖 propagation（場次 4 完賽 → resolve 場次 76 → 場次 76 完賽 → resolve 後續）正常運作。
- 既有寢技計時、傷停、押制、Shido、Full-IPPON 流程不受影響（既有單元 / E2E smoke 測試通過）。

### Scope 邊界

**In scope**：
- 寢技匯入解析 + propagation + bye 流程。
- MatchTier 擴充至 7 級。
- 既有 ELEM 資料以 seed 腳本協助管理員手動 migrate。

**Out of scope**：
- 對打 / 格鬥匯入解析變更（保留以 i+1 + 4 級 tier 運作，不改動）。
- 觀眾端 UI 重繪（既有 socket 訂閱會收到 advancement-resolved 自動反映）。
- 任何 score 計算邏輯。

## Risks / Trade-offs

| 風險 | 影響 | 緩解 |
|---|---|---|
| ELEM enum 移除導致既有寢技資料寫入失敗 | 既有 production data 若有 ELEM tier 場次，新版會 enum validation 拒絕 | seed 腳本 dry-run 列出影響範圍，由管理員 migrate 後再部署；若資料量 0 可直接切換 |
| Propagation 連鎖深度過大 | 場次 A → B → C → ... 鏈式完賽會多次同步觸發 | 一場完賽僅 update 直接引用它的下游，不遞迴；下游完賽再各自觸發自己的下游，自然分段 |
| 多場次同時完賽競態（admin 強制 update 多場） | 兩場同時 propagate 到同一下游場次（不可能 — 一場只能被 redSource 或 blueSource 引用，不會兩邊都引同一場） | schema 設計天然避免（fromMatchNo 不同的兩場 source 互不衝突） |
| 匯入解析器與既有解析器邏輯重複 | 既有 match-management 前端有解析邏輯，新 utils 又一份 | 前端維持解析「分級」+「{N}勝」並送到後端 bulkCreate；後端不重新解析字串，只接收已解析欄位（含 tier、redSource、blueSource 等 plain object）— 前端用 fetch 同等 util；或單純前端解析，後端只 validate |
| 裁判誤點 bye 場次紅方勝 | 若 isBye 判斷錯，可能跳過比賽 | 後端在 status 機加 isBye 條件式 guard；若試圖在 isBye=false 場次走 pending → completed 直接 reject |

最後一點折衷：utils/matchImport.ts 由 **前端使用**（同樣語意的解析器在前端做，送到後端的是已結構化的 plain object），後端只負責 validate + insertMany。原因：既有匯入流程就是前端解析（XLSX 在前端讀檔），新增邏輯維持同模式減少架構變動。後端 utils/matchPropagation.ts 維持後端 only。

→ 修正：`utils/matchImport.ts` 實際位置改為 `frontend/src/app/core/utils/matchImport.ts`（純 TypeScript，無 Angular 依賴）。Tasks 與 Impact 段落以此為準。
