## Context

`jujitsu-tournament-expansion` 變更於 2026-05-20 歸檔後，承辦人員在閱讀手冊 §4.2 時對流程模型提出疑問："多輪 tier 是不是『同 category 跑完三輪』比較合理？" 經查實際需求是：

1. **群組執行順序應依匯入 Excel 列順序**，不需要 admin 在系統內另外設定 categoryOrder
2. **同 (tier, category) 群組內，每隊完整跑完所有 round 才換下一隊**——不是同 round 跨 category 輪轉

這是基本的競賽節奏設計：選手上台一氣呵成跑完 3 系列、可立即頒獎，符合現場運作。原本 tier-major × round-major 模型反而會讓同一隊伍要分 3 次上場、頒獎時間被拉長。

## Goals / Non-Goals

**Goals:**

- 錦標賽流程改為「Excel-row order × per-team-rounds-first」狀態機，符合現場競賽節奏
- 移除 admin 介面的 categoryOrder 設定（對錦標賽不再有意義）
- 保留 EL/EM 單輪連續演練模型不變
- 保留 EH 無 VR 規則不變
- 保留 sports-day 既有 category-major 行為（向後相容絕對不能破）

**Non-Goals:**

- 不引入新 capability，僅修改既有 specs
- 不改動 Mongoose schema 或 Socket.IO 事件
- 不改動觀眾顯示、計分演算法、排名計算
- 不改動其他項目（創意演武 / 寢技 / 對打 / 格鬥）的流程

## Decisions

### D1: nextGroup 採「事件條件分支」而非「state machine 重設計」

**選擇**：在 `flowController.nextGroup` 內以 `if (isTournament)` 分支：錦標賽走新邏輯、sports-day 完整保留舊邏輯（含 `resolveCategoryOrder`、category-major rotation）。

**理由**：sports-day 邏輯已穩定多年並有現場驗證；錦標賽是新場景，新流程獨立分支可降低回歸風險。共用部分（VR 檢查、advance helper、event 查詢）保留 single path 避免重複。

**替代方案**：完全統一兩種賽會的流程（如把 sports-day 視為單一虛擬 tier 走新邏輯）→ 被否決，sports-day 5 隊測試證明會破壞既有 category-major rotation。

### D2: 錦標賽群組建構採「Excel-row 首次出現決定順序、自動合併不連續列」

**選擇**：新增純函式 `buildTournamentGroups(teams)`：

```typescript
// 依 team.order 升冪走訪
// 用 Map<groupKey, group> 累積，並用 keyOrder[] 記錄首次出現順序
// 不連續同 (tier, category) 列自動合併到同一群組
```

**理由**：
- 承辦人員的心智模型是「按 Excel 列順序排好就好」，不需要在系統內二次配置
- 純函式便於單元測試（已驗證連續 / 不連續兩種 case）
- 與 sortTeams 並存，sortTeams 仍提供 sports-day 與其他排序需求

**替代方案**：
1. 用 sortTeams + 嚴格 tier 順序常數 → 否決，無法按使用者要求調整群組順序
2. 在 Event Model 新增 `groupOrder: string[]` 欄位讓 admin 拖曳 → 否決，與「依 Excel 即可」原則衝突，UI 複雜度高

### D3: EH 多輪 tier 但無 VR

**選擇**：EH 走 (tier, category) per-team-rounds-first 流程（同 EH/JH/SH/OPEN），但 nextGroup 不檢查 VR（同 EL/EM 跳過 VR 檢查）。

**理由**：spec `elementary-kata-rules` 明確規定「EL/EM/EH 三組無 VR」。流程模型上 EH 仍是 3 輪（每系列 3 動作），但 nextGroup 推進不卡 VR 條件。

**程式碼實作**：`isElementaryTier(EH) === true` 觸發 `skipVrCheck = true`；同時 `isElementaryAB`（EL/EM 專屬）為 false，所以 EH 走 maxRound=3 分支。

### D4: 錦標賽 admin 介面隱藏「組別順序」設定

**選擇**：在 `admin.component.html` 包覆 `@if (!isTournament())` 隱藏整個 categoryOrder 拖曳區塊（含 edit-mode + display-mode）。

**理由**：對錦標賽而言該設定已無作用（nextGroup 完全不查 categoryOrder）。保留 UI 反而造成「以為改了會生效」的誤導。Sports-day 賽會仍保留此 UI。

## Implementation Contract

### 行為變更（使用者可觀察）

- **錦標賽 nextGroup 推進**：對 EH/JH/SH/OPEN 隊伍，先在同隊內推進 R1 → R2 → R3（每輪重新初始化 actionProgress）；R3 完成後才換到 (tier, category) 內下一隊；該群組所有隊伍跑完後換下一群組。
- **錦標賽群組順序**：完全依 Excel 列順序。例如 17 隊 Excel 第一列為 EL-male，則賽程從 EL-male 開始；EL-female 0 隊則該群組根本不會出現在序列中。
- **錦標賽 admin 介面**：「組別順序」拖曳區塊不再顯示。
- **Sports-day 行為**：完全不變（category-major × round-cycling、保留 categoryOrder 設定 UI）。

### 資料介面

無 schema 變更。已既有欄位 `Team.order`（Number）作為唯一排序依據。

### 失敗模式

- 錦標賽 EL/EM/EH 隊伍在 nextGroup 中不檢查 VR（不會回 403 "VR 尚未送出"）
- 錦標賽 JH/SH/OPEN 在 nextGroup 仍檢查當前 round 的 VR；未送出回 403
- 單隊組別呼叫 nextGroup 不再回 400（前次變更已移除 guard，本次保留）

### 驗收條件

1. 用 115 錦標賽實際 17 隊資料模擬 nextGroup，全程 35 步序列每一步的 (tier, category, round, team) 與預期完全吻合
2. EH 4 隊每隊跑滿 3 輪後才換下一隊（驗證 per-team-rounds-first）
3. EL/EM 所有步驟 round 都是 1（單輪連續流程不變）
4. sports-day 5 隊（3 female + 2 male）模擬 nextGroup 全程 15 步，序列為「female R1→R2→R3 三隊全部跑完 → male R1→R2→R3 三隊全部跑完」（category-major 不變）
5. 空 (tier, category) 群組（如 EL-female 0 隊）不會出現在序列中
6. 8 個單隊組別都正確自動推進到下一非空群組
7. EH 隊伍資料庫無 VRScore 記錄；JH/SH/OPEN 每隊每輪都有 VRScore
8. Rankings API 對 EL/EH 不回傳 vrScoreA/B/C 欄位；對 JH/SH/OPEN 回傳完整 VR

### 範圍邊界

**In scope:**
- 錦標賽 nextGroup 流程重寫
- buildTournamentGroups helper
- admin 介面隱藏錦標賽的 categoryOrder UI
- 新增 HTML 操作手冊

**Out of scope:**
- 觀眾顯示、計分介面、VR 介面、創意演武介面（未變動）
- 寢技、對打、格鬥流程（未變動）
- 匯出 Excel/PDF 格式（未變動）
- Mongoose schema 與 Socket.IO 事件名稱

## Risks / Trade-offs

- **與既有 archive 的偏離風險** → 緩解：本 change 透過 MODIFIED requirements 在 `single-team-group-flow` spec 中重新陳述新流程，archive 後主 spec 將取代舊陳述。
- **EH 與 EL/EM 行為的差異難以記憶**（都「無 VR」但 EH 是多輪、EL/EM 是單輪） → 緩解：在手冊 §3.1 三種 tier 流程模型對照表清楚說明。
- **不連續 Excel 列的合併語意可能造成意外** → 緩解：buildTournamentGroups 已有單元測試覆蓋連續/不連續兩種 case；範本建議承辦人員把同 (tier, category) 連續排列。

## Migration Plan

無資料遷移。本變更純為流程邏輯調整。既有 tournament events 因尚未有實際比賽資料（115 錦標賽尚未開賽），無歷史 GameState 需要處理。
