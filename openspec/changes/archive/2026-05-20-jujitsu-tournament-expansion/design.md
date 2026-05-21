## Context

平台目前已支援單一賽會類型「宜蘭縣運動會」，所有 Event/Team/Match 邏輯預設遵循該賽制：性別三分組（male/female/mixed）、傳統演武 3 輪 A/B/C 系列、VR 裁判全程介入、寢技 6 分鐘預設、創意演武超時/不足 -1 分。SPEC-v3.md 引入第二個賽會「宜蘭縣柔術錦標賽」，需要在不影響運動會行為的前提下擴充：新增二級分組維度、國小組規則差異（5 處）、單隊組別輪次省略、觀眾顯示與匯出的分組標籤調整。

關鍵限制：
- 既有運動會 events/teams/matches 資料必須能持續正常運作，無破壞性變更
- LAN 部署，無法逐步發版——一次發版要同時支援兩種賽會
- Socket.IO 事件名稱不變（向後相容房間內客戶端），payload 可擴充
- 既有 specs（competition-type-selection、event-list-management、ne-waza-scoring、creative-embu-penalty、match-audience-display、admin-dashboard）以 delta 方式擴充，不重寫

## Goals / Non-Goals

**Goals:**
- 以 `competitionType` 欄位作為賽會行為的單一分支點，讓所有「錦標賽特殊規則」可在 controller/utility 層以一個布林判斷收斂
- 二級分組（tier）為 Team/Match 的一等資料欄位，排名群組鍵改為 `(category, tier)` 複合鍵
- 國小組規則（無 VR、不扣超時分、動作數限制、單輪流程）一律以「tier ∈ {EL, EM, EH}」為唯一判定條件，避免散落多處 hard-code
- 單隊組別判定（隱藏 R/G、停用換組、自動換系列）由後端在 `/rankings` 或 `/summary` 端點計算後一次性傳遞給前端，避免前端各畫面自行重算
- 既有資料零遷移成本：未填 `competitionType` 視為 `sports-day`、未填 `tier` 視為 `null`（運動會所有 teams）

**Non-Goals:**
- 不重寫既有計分演算法（`utils/scoring.ts` 的去頭尾邏輯不變）
- 不引入 Feature Flag 系統（`competitionType` 已是事實上的旗標）
- 不為「柔術技」項目預留 schema 欄位（另案規劃，避免提前設計鎖死方向）
- 不變更 Socket.IO 房間結構與事件名稱

## Decisions

### D1: `competitionType` 放在 Event Model，不放在 User 或 Session

**選擇**：Event.competitionType: 'sports-day' | 'tournament'（default: 'sports-day'）

**理由**：賽會是 Event 的固有屬性，同一個使用者可能參與兩種賽會的不同 Event；所有差異規則最終都以 `event.competitionType` 為判斷依據。User 模型維持不變，避免重新登入或角色重新指派的需求。

**替代方案**：在 User 加 `currentCompetition` 欄位——被否決，因為使用者切換賽會時需更新 User，UX 與資料一致性都更複雜。

### D2: `tier` 為 Team 的一等欄位，預設 `null`

**選擇**：Team.tier: 'EL' | 'EM' | 'EH' | 'JH' | 'OPEN' | 'ELEM' | null（運動會 teams 一律 null）

**理由**：tier 是 Team 報名時的屬性，匯入 Excel 時新增欄位；排名/觀眾顯示/匯出都要直接讀取，放在 Team 比放在 Event-level mapping 更直接。Match Model 也加 `tier` 欄位，便於寢技分組（國小/國高中/公開）。

**替代方案**：用一個獨立的 `team_tiers` collection 對應——被否決，多一次 join 沒有實質收益。

### D3: 排名群組鍵改為 `(category, tier)`，群組計算邏輯集中於 `utils/scoring.ts`

**選擇**：所有排名相關函式接收 `teams: Team[]` 後依 `(category, tier)` 分群，運動會 teams 因為 tier=null 落入 `(category, null)` 群組，行為與現有完全一致。

**理由**：單一群組鍵運算邏輯，運動會與錦標賽共用同一函式，差異收斂在資料層。

### D4: 國小組差異規則統一以 `isElementaryTier(tier)` 判斷

**選擇**：在 `utils/tournament.ts` 提供 `isElementaryTier(tier: string | null): boolean`，回傳 `tier === 'EL' || tier === 'EM' || tier === 'EH'`。所有需要禁用 VR、跳過超時罰則、套用單輪流程的地方都呼叫此函式。

**理由**：邏輯集中，未來新增/移除國小組別只改一處。

### D5: 國小低/中年級單輪流程不引入新 GameState status，沿用既有 `action_open/closed/series_complete`

**選擇**：`flowController.openAction()` 依據 `currentTeam.tier` + `event.competitionType` 決定下一動作序列；換組（next-group）的判定條件改為「目前隊伍已演完該組別所有應做動作」。

**理由**：避免新增 GameState 狀態增加 client 端 switch 負擔。「動作完成」由動作序列推進邏輯判斷，不需新 status。

**替代方案**：新增 `single_round_in_progress` status——被否決，過度設計。

### D6: 單隊組別判定由後端計算後放在 `/summary` 回應中

**選擇**：`GET /events/:id/summary` 回應加上 `singleTeamGroups: { 'male:EH': true, 'female:ELEM': false, ... }` map；前端各畫面依此 map 決定是否隱藏 R/G、停用換組按鈕。

**理由**：避免前端各畫面各自從 teams 列表計數重算；後端在計算 ranking 群組時順便算出，零成本。

### D7: 觀眾顯示標籤組合改為 `{category} {tier} R{round}-G{group}`

**選擇**：頂部標籤格式：
- 多隊組別：`MALE EH R1-G2`
- 單隊組別：`MALE EH`（隱藏 R-G）
- 運動會（tier=null）：`MALE R1-G2`（行為不變）

**理由**：tier 為 null 時自動跳過，運動會顯示完全相容。

### D8: 既有 specs 以 delta 形式新增 Requirement，不修改既有條文

**選擇**：所有 `Modified Capabilities` 在 spec 檔以「ADDED Requirement」段落新增條文（如「Tournament 賽會時 ...」），既有 Requirement 不刪不改。

**理由**：保留向後相容性，運動會仍滿足原 Requirement，錦標賽額外滿足新 Requirement。

### D9: JH 重新定義為「青少年國中組」+ 新增 SH「青少年高中組」（追加範圍）

**選擇**：原 `JH = 國高中組` 拆分為兩個獨立 tier：

| Tier code | 中文 label | 寢技預設 | 適用項目 |
| --- | --- | --- | --- |
| JH | 青少年國中組（重新定義） | 180s（3 分鐘） | Duo / Show / Ne-Waza |
| SH | 青少年高中組（新增） | 180s（3 分鐘） | Duo / Show / Ne-Waza |

`TeamTier` 列舉新增 `'SH'`；`MatchTier` 列舉新增 `'SH'`。`getNeWazaDefaultDurationSeconds` 對 JH/SH 皆回傳 180。匯入 Excel 中英對照表加入「青少年國中」「青少年高中」兩組同義詞。

**理由**：實務上國中與高中選手體能、技術差異大，主辦方需獨立分組頒獎；保留 `JH` 代碼讓既有測試/種子資料的語意自動切換為「青少年國中組」即可，**不需要寫 Mongo migration script**。動作數量規則（依性別 3 或 4）、VR 評分、單隊組別等其餘行為對 JH/SH 完全相同——程式碼上 SH 走和 JH 相同的非國小路徑。

**替代方案**：
1. 引入 `JJH/JSH` 兩個全新代碼並對 JH 寫 migration → 被否決，徒增遷移成本
2. 在 JH 上加 `gradeLevel: 'junior' | 'senior'` 子欄位 → 被否決，群組鍵會變 `category:tier:gradeLevel`，影響所有 ranking/audience/export 邏輯

**遷移**：既有 tier=JH 的 Team/Match 文件**不變更**；語意上自動視為「青少年國中組」。需要參賽高中組時新增 tier=SH 的隊伍即可。

### D10: 演武排序改為 tier 主、category 次；nextGroup 改採 (tier, category, round) 狀態機（追加範圍）

**選擇**：

1. `utils/teamSort.ts` 排序鍵從 `category → tier → order` 改為 **`tier → category → order`**。
2. `TIER_ORDER` 補 `'SH'`，完整順序為 `['EL', 'EM', 'EH', 'JH', 'SH', 'OPEN', 'ELEM']`（修正 D9 階段遺漏）。
3. `flowController.nextGroup` 改為 `(tier, category, round, teamIdx)` 狀態機；於同一 tier 內完成 R1 全部 category → R2 全部 category → R3 全部 category，再換下一 tier。EL/EM 維持單輪連續演練（無 round 迭代）。
4. nextGroup 自動跳過空 `(tier, category)` 群組（admin 設定的 categoryOrder 含某 category 但該 tier 無對應隊伍時）。
5. **移除 D6（單隊 (category, tier) 群組 nextGroup 回 400）**——前端 `canNextGroup` 已確保「所有動作完成 + 國高公開組 VR 送出」才會 enable，足以防止誤觸；保留 guard 會在實際資料（單隊組別常見、約佔 75%）下卡住流程。

**理由**：

- 現場競賽以同年齡組（tier）為頒獎單位，賽程一氣呵成；舊「category 主」排序會把同 tier 不同年齡分散在不同 category 段落，與頒獎節奏對不上。
- 實際 17 隊匯入資料中有 6 個 single-team groups，舊 D6 guard 會讓 admin 必須手動切換隊伍 6 次以上。
- Sports-day 所有隊伍 tier=null，新排序退化為單一虛擬 tier，行為與本變更前完全一致（回歸風險可控）。

**狀態機簡述**：

```
nextGroup(currentTeam):
  groupTeams = sortedTeams.filter(category == cur.category AND tier == cur.tier)
  if teamIdx < lastIdx in groupTeams:
    advance to next team in same (tier, category, round)
  else if tier is EL or EM:                  # 單輪連續演練
    advance to first team of next non-empty (tier, category)
  else if round < 3:                          # EH/JH/SH/OPEN 可再進 round
    advance to next non-empty (tier, category, round R)
    若同 tier 同 round 已無下一個 category → 同 tier 換 round R+1 第一個 category
    若該 tier round=3 已完成 → 換下一非空 tier 的第一 category, round=1
  else:
    event_complete
```

**替代方案**：

1. 保留 D6 + 新增「下一群組」按鈕（分離換組 vs 換群組）→ 被否決，UI 學習成本翻倍。
2. 後端計算「群組是否完成」放行 D6 → 被否決，需查 Score/VRScore 跨 round 累積狀態，邏輯複雜風險高。

**遷移**：sortTeams swap 對 sports-day 無影響（tier=null 全部同 rank，等同退化為原行為）；既有測試 / 種子資料無需遷移。

## Implementation Contract

### 行為（使用者可觀察）

- **管理員**：建立 Event 時可選「宜蘭縣運動會」或「宜蘭縣柔術錦標賽」；錦標賽 Event 的 Team 匯入 Excel 範本含 `tier` 欄位（EL/EM/EH/JH/OPEN/ELEM 之一），運動會 Event 的範本維持現狀無 tier 欄位
- **賽序裁判（錦標賽國小低/中年級組）**：開放隊伍 N 的 A1 評分 → 評分完成自動跳到 A2 開放鈕 → ... → A 系列全部完成後直接跳到 B1 開放鈕（無「換輪」步驟）→ B 系列全部完成 → 「換組」鈕亮起換到隊伍 N+1
- **賽序裁判（單隊組別）**：「換組」鈕全程灰底停用；A 系列完成後不出現換輪步驟，自動推進到 B1
- **VR 裁判（錦標賽國小組）**：頁面顯示「此組別不需要 VR 評分」提示，所有評分按鈕停用；錯誤攻擊標記按鈕停用
- **計分裁判（錦標賽國小低/中年級組）**：介面與現有相同（每動作仍是 4 項 9 分），無感變更
- **觀眾顯示（錦標賽）**：頂部標籤顯示「一級 二級 R-G」，例如 `MALE EH R1-G2`；單隊組別自動隱藏 R/G 區段
- **觀眾顯示（運動會）**：標籤格式與行為完全不變（tier=null 不顯示二級欄位）
- **創意演武（錦標賽國小組）**：超時/不足時間 -1 分罰則不觸發，其他罰則（道具、攻擊不足）仍照舊
- **寢技（錦標賽）**：建立 Match 時依 tier 套用預設秒數（ELEM=120、JH=180、OPEN=300），裁判可手動調整
- **成績匯出（錦標賽）**：Excel/PDF 依 `(category, tier)` 拆分，例如「男子組 × 國小高年級.xlsx」「女子組 × 公開組.xlsx」；運動會匯出維持依 `category` 拆分

### 資料介面

**Event Model（新增）**：
```typescript
competitionType: 'sports-day' | 'tournament'  // default: 'sports-day'
```

**Team Model（新增）**：
```typescript
tier: 'EL' | 'EM' | 'EH' | 'JH' | 'OPEN' | 'ELEM' | null  // default: null
```

**Match Model（新增）**：
```typescript
tier: 'ELEM' | 'JH' | 'OPEN' | null  // default: null（寢技用）
```

**API 端點變更**：

- `GET /events/:id/rankings` 回應：每筆 ranking 加上 `tier` 欄位
- `GET /events/:id/summary` 回應：新增 `singleTeamGroups: Record<string, boolean>`，key 為 `${category}:${tier ?? 'none'}`
- `POST /events` body：接受 `competitionType` 欄位
- `POST /events/:id/teams/import` Excel 範本：錦標賽 Event 多一欄 `tier`

**Socket.IO payload 擴充**（事件名稱不變）：

- `team:abstained` / `team:abstain-cancelled`：payload 加 `tier`
- `group:changed`：payload 加 `tier`
- `round:changed`：payload 加 `tier`
- `match:started` / `match:ended`：payload 加 `tier`

**Helper 函式（新增）**：

- `backend/src/utils/tournament.ts`
  - `isElementaryTier(tier: string | null): boolean` — 是否為國小組（EL/EM/EH）
  - `getElementaryMotions(tier: 'EL' | 'EM' | 'EH', series: 'A' | 'B' | 'C'): string[]` — 回傳該組別該系列可用動作清單（EL: ['A1','B1']、EM: ['A1','A2','B1','B2']、EH: ['A1','A2','A3','B1','B2','B3','C1','C2','C3']）
  - `getElementaryMatchDurationSeconds(tier: 'ELEM' | 'JH' | 'OPEN'): number` — 寢技預設時長

### 失敗模式

- 錦標賽 Event 建立 Team 時未提供 tier → 後端回 400「錦標賽隊伍必須指定二級分組」
- 運動會 Event 提供 tier → 後端忽略並回 200（tolerant），記 warning log
- 既有運動會資料無 competitionType 欄位 → Mongoose 載入時套用 default `sports-day`，無需 migration script

### 驗收條件

1. 既有運動會 Event 完整跑完一場演武+寢技，所有計分/排名/觀眾顯示與本變更前完全一致
2. 錦標賽 Event 國小低年級 1 隊（單隊）完整跑完：A1→B1 流程、觀眾顯示 `MALE EL`（無 R/G）、無 VR/錯誤攻擊按鈕、排名表只顯示 A、B 欄位
3. 錦標賽 Event 國高中組 4 隊女子組完整跑完：A1-A3、B1-B3、C1-C3（3 動作版）、3 輪輪轉、VR 評分正常、觀眾顯示 `FEMALE JH R1-G2`
4. 錦標賽 Event 國小組寢技建立 Match 時預設 120 秒、國高中組預設 180 秒、公開組預設 300 秒
5. 錦標賽 Event 國小組創意演武超時 30 秒不扣分；國高中組創意演武超時 30 秒扣 1 分
6. 成績匯出錦標賽 Event 產生「男子組×國小低年級.xlsx」「女子組×公開組.xlsx」等多份檔案；匯出運動會 Event 產生「男子組.xlsx」「女子組.xlsx」（不依 tier 拆）

### 範圍邊界

**In scope:**
- Event/Team/Match Model 欄位新增、API/Socket payload 擴充
- 排名群組計算、單隊判定、國小組差異規則的後端實作
- 5 個前端裁判介面與觀眾顯示的對應 UI 變更
- Excel/PDF 匯出依新分組結構

**Out of scope:**
- 柔術技項目（10 分制）
- 既有運動會行為的任何調整
- 賽會切換的中途資料遷移（單一 Event 一旦建立後 competitionType 不可變）

## Risks / Trade-offs

- **既有運動會回歸風險**：兩種賽會共用同一份程式碼，國小組規則的條件判斷散在多處 → 在 `utils/tournament.ts` 集中化判定函式，加上 E2E 測試覆蓋運動會完整流程
- **資料模型遷移**：既有 events 無 `competitionType` 欄位 → 不寫 migration script，依賴 Mongoose default value 兜底；驗證方式：載入既有 events 後 `.competitionType` 應為 `'sports-day'`
- **單隊判定時機**：賽前報名後是否還會異動（中途加隊/退隊）→ 暫定以「rankings 端點呼叫當下」即時計算，效能可忽略（< 100 teams）
- **觀眾顯示動態切換**：若比賽中途有隊伍退賽導致變成單隊組別 → 觀眾顯示會即時切換為「無 R/G」格式，可能造成 UI 跳動 → 接受此跳動，視為合理行為
- **Excel 匯入範本相容性**：錦標賽範本新增 tier 欄位 → 提供「下載最新範本」按鈕，匯入時若缺 tier 欄位（錦標賽 Event）→ 回 400 並提示下載新範本

## Migration Plan

1. **資料庫無 schema migration**：Mongoose default 在讀取時自動套用 `competitionType: 'sports-day'` 與 `tier: null`，既有運動會資料零變更
2. **發版順序**：後端先發版（向後相容，舊前端打舊欄位仍可運作）→ 前端再發版（新欄位 UI 出現）
3. **既有 Event 升級為 tournament**：管理員需建立新 Event 並選擇「宜蘭縣柔術錦標賽」，現有運動會 Event 無法原地升級（避免資料污染）
4. **回滾**：若需回滾，刪除新 Event 即可；既有運動會 Event 不受任何影響
