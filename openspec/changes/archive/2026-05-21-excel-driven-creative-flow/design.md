## Context

`excel-driven-flow` 變更已歸檔，雙人傳統演武（Duo）的賽程推進改為依 Excel 列順序執行。但雙人創意演武（Show）的對應變更未一併進行——它仍使用 `sortTeams + resolveCategoryOrder('Show')` 來決定 nextTeam 的隊伍順序。

對承辦人員而言，這造成兩個項目（演武 vs 創意演武）的賽程設定規則不一致：
- Duo：完全依 Excel 列順序
- Show：依 Excel 排好 + 還要在系統內設定「組別順序 Show」

實際上「組別順序 Show」拖曳 UI 已在 `excel-driven-flow` 階段被 `@if (!isTournament())` 包覆隱藏（兩種競賽類型的設定在同一個 UI block 內），但**後端 nextTeam 邏輯仍會讀取 categoryOrderShow**——導致 UI 隱藏但實際排序仍受 categoryOrder 影響的詭異狀態。

## Goals / Non-Goals

**Goals:**

- 錦標賽創意演武 nextTeam 推進改為依 `team.order` 升冪（與 Duo 一致）
- 對齊 Duo 的 conditional branch 設計：`if (isTournament)` 分支
- 保留 sports-day 既有行為（`sortTeams + resolveCategoryOrder('Show')` + category-major）
- 用使用者提供的實際 9 隊 Show 資料驗證完整流程

**Non-Goals:**

- 不引入 round 概念到創意演武（其本來就是單次表演，無 R1/R2/R3）
- 不修改評分演算法、計時器、棄權邏輯
- 不修改 Mongoose schema 或 Socket.IO 事件
- 不改動觀眾顯示與排名計算

## Decisions

### D1: 沿用 Duo 變更的「事件條件分支」模式

**選擇**：`creativeFlowController.nextTeam` 內加入：

```typescript
const isTournament = event?.meetingType === 'tournament';
const sortedTeams = isTournament
  ? [...allTeams].sort((a, b) => a.order - b.order)
  : sortTeams(allTeams, resolveCategoryOrder(event, 'Show'));
```

其餘的「找下一個未完賽 + 未棄權的隊伍」邏輯完全保留。

**理由**：
- 與 `excel-driven-flow` 的 Duo 修改完全對齊，承辦人員兩個項目用同一個心智模型
- 改動極小，回歸風險低
- sports-day 路徑零變更

**替代方案**：
1. 將 sortTeams 直接擴充為「自動判斷 tournament 用 order、sports-day 用 category」→ 否決，sortTeams 是純函式不該感知 event 資料模型
2. 引入新函式 sortTeamsForCreativeTournament → 否決，過度抽象，內聯 `[...].sort(...)` 即清楚

### D2: 不引入「群組」概念

**選擇**：創意演武繼續使用「線性隊伍列表」，不像 Duo 那樣建構 (tier, category) 群組。

**理由**：
- 創意演武每隊只表演 1 次，沒有 round 推進，「群組」概念對流程沒有實質意義
- nextTeam 邏輯就是「找下一個未完賽 + 未棄權」，線性掃描即可
- 觀眾顯示與排名仍按 (category, tier) 分組（這部分由 `getEventRankings` 用 creative 路徑處理，沿用既有邏輯不變）

### D3: 不修改 admin UI（已自動受 Duo 變更覆蓋）

**選擇**：不再額外處理 admin 介面的隱藏邏輯。

**理由**：在 `excel-driven-flow` 變更時整個「組別順序」拖曳 UI block（涵蓋 Duo + Show 兩種設定）已用 `@if (!isTournament())` 包覆。本變更只需處理後端排序邏輯，前端無需動工。

**驗證**：在實作後手動確認 admin 介面對 tournament event 確實看不到 categoryOrderShow 設定。

## Implementation Contract

### 行為變更（使用者可觀察）

- **錦標賽創意演武「下一組」按鈕**：依 Excel 列順序推進到下一支未完賽 + 未棄權的隊伍
- **錦標賽創意演武觀眾顯示**：當前隊伍按 Excel 列順序循環顯示（無 round 概念，仍只顯示 category + tier）
- **Sports-day 創意演武**：完全不變

### 資料介面

無 schema 變更。沿用既有：
- `Team.order` (Number) — Excel 匯入時遞增分配的場次序
- `CreativeGameState.currentTeamId` — 當前上台隊伍
- `CreativeScore` — 5 位裁判評分（5 筆即視為完賽）

### 失敗模式

- 無新增失敗模式。原有「無下一隊」狀態（nextTeamId=null）仍由前端自行處理（顯示「所有隊伍評分完畢」）

### 驗收條件

1. 用使用者提供的 9 隊資料模擬 9 步 nextTeam 推進，序列為：
   - female EL 大隱國小 → mixed EL 大隱國小 → female EM 大隱國小 → male EM 大隱國小 → male EM 柯林國小 → mixed EM 大隱國小 → male EH 柯林國小 → female JH 國華國中 → male JH 國華國中
2. 第 10 次呼叫 nextTeam 應回傳 `nextTeamId: null`（無下一隊）
3. Sports-day 9 隊（不同分布）模擬 nextTeam 推進序列為 female 全部 → male 全部 → mixed 全部（category-major 不變）
4. 創意演武排名輸出依 (category, tier) 分組，與 Duo 的排名邏輯一致

### 範圍邊界

**In scope:**
- `creativeFlowController.nextTeam` 加入 isTournament 分支
- 驗證腳本

**Out of scope:**
- 計時器、棄權、評分流程
- 罰則計算（已在 jujitsu-tournament-expansion 完成）
- 計分演算法
- Mongoose schema、Socket.IO 事件

## Risks / Trade-offs

- **Creative 與 Duo 流程差異仍大**（前者單次、後者多輪）→ 緩解：手冊明確區分兩個項目的流程模型，避免使用者誤解
- **既有測試/種子資料中 Show 排序行為若依賴 categoryOrderShow，本變更會改變排序** → 緩解：sports-day 路徑完全保留，僅 tournament 受影響；錦標賽尚無歷史資料

## Migration Plan

無資料遷移。
