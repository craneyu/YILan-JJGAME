## Why

宜蘭縣柔術錦標賽是平台需要支援的第二個賽會類型，與既有的宜蘭縣運動會共用 Auth/Socket.IO/MongoDB 基礎建設，但賽制有顯著差異：傳統演武與創意演武新增國小組的動作數量限制與不扣超時分規則、寢技各組別比賽時間預設值不同、跨項目共用全新的「二級分組（年齡/級別）」機制。需要在同一平台以新賽會類型方式擴充，且現有的宜蘭縣運動會賽制與操作流程必須完全不受影響。

## What Changes

- **新增「宜蘭縣柔術錦標賽」賽會類型**：Event Model 新增 `competitionType` 欄位（`sports-day` | `tournament`）區分兩種賽會
- **二級分組（年齡/級別）制度**：在現有性別分組（一級）之外新增 7 個年齡/級別代碼（EL/EM/EH/JH/SH/OPEN/ELEM），Team Model 新增 `tier` 欄位；排名以「一級分組 × 二級分組」為獨立群組計算
- **【追加】JH 重新定義 + 新增 SH（青少年高中組）**：原「國高中組」拆分為「青少年國中組 (JH)」與「青少年高中組 (SH)」兩個獨立 tier；既有 tier=JH 的測試/種子資料一律視為「青少年國中組」（語意變更、不需要遷移腳本）。SH tier 適用於傳統演武、創意演武、寢技三項；其他規則（VR 裁判、單隊組別、單輪流程、動作數量依性別區分）對 JH/SH 行為完全相同
- **國小組傳統演武差異規則**：低/中/高三組各有動作數量限制（A1B1 / A1A2B1B2 / A1-A3·B1-B3·C1-C3）、國小所有年級組停用 VR 裁判、低/中年級改為「同一隊上台演完 A+B 全部動作後才換下一隊」的單輪連續流程
- **國高中組與公開組傳統演武動作數量依性別區分**：男子組 A/B/C 各 4 動作，女子組與混合組 A/B/C 各 3 動作
- **國小組創意演武不扣超時分**：移除 EL/EM/EH 三組的超時/不足時間 -1 分罰則，其餘組別維持現有規則
- **寢技各組別預設比賽時間**：國小組（ELEM）2 分鐘、青少年國中組（JH）3 分鐘、青少年高中組（SH）3 分鐘、公開組（OPEN）5 分鐘（裁判可於賽前調整），現有 6 分鐘預設不再使用
- **單一隊伍組別輪次省略規則**：若某「一級 × 二級」群組僅一隊報名，賽序裁判介面停用「換組」按鈕、系統依固定序列 A→B→C 自動推進、觀眾顯示隱藏 R 與 G 標籤；VR 評分仍維持系列邊界觸發
- **觀眾顯示加入二級分組欄位**：頂部標籤改為「一級 × 二級 R-G」（如 `MALE EH R1-G2`），單隊組別隱藏 R/G
- **成績匯出適用新分組結構**：Excel/PDF 依「一級分組 × 二級分組」群組拆分匯出檔案，沿用現有匯出格式

## Non-Goals

- 不涉及「柔術技」項目（10 分制、小數 1 位、5 裁判去頭尾加總），該項目計分機制與現有 9 分制整數架構差異過大，將另案規劃
- 不修改對打（Fighting）、格鬥（Contact）的計分規則與裁判介面（沿用現有）
- 不修改認證系統、Socket.IO 房間架構、MongoDB 基礎結構
- 不修改既有「宜蘭縣運動會」的任何賽制、裁判介面、流程控制（必須完全向後相容）
- 不新增 Socket.IO 事件名稱（既有事件 payload 加入 `tier` 欄位即可）

## Capabilities

### New Capabilities

- `tournament-team-grouping`: 二級分組（年齡/級別）制度——分組代碼定義、Team Model 欄位、各項目適用分組對照、排名以「一級 × 二級」為獨立群組計算
- `elementary-kata-rules`: 國小組傳統演武差異規則——依年級的動作數量限制、停用 VR 裁判、低/中年級單輪連續演練流程
- `single-team-group-flow`: 單一隊伍組別輪次省略規則——換組按鈕停用、自動依 A→B→C 序列推進、觀眾顯示隱藏 R/G 標籤、VR 評分保留於系列邊界

### Modified Capabilities

- `competition-type-selection`: 新增「宜蘭縣柔術錦標賽」賽會類型選項
- `event-list-management`: Event Model 新增 `competitionType` 欄位
- `creative-embu-penalty`: 國小組（EL/EM/EH）超時/不足時間不扣分
- `ne-waza-scoring`: 比賽時間預設值改為依組別（國小 2 分鐘 / 國高中 3 分鐘 / 公開 5 分鐘）
- `match-audience-display`: 頂部標籤加入二級分組欄位、單隊組別隱藏 R/G 標籤
- `admin-dashboard`: 成績匯出（Excel/PDF）依「一級分組 × 二級分組」群組拆分

## Impact

- **後端 Model**：
  - `backend/src/models/Event.ts` — 新增 `competitionType: 'sports-day' | 'tournament'` 欄位
  - `backend/src/models/Team.ts` — 新增 `tier: 'EL' | 'EM' | 'EH' | 'JH' | 'SH' | 'OPEN' | 'ELEM' | null` 欄位
  - `backend/src/models/Match.ts` — 新增 `tier: 'ELEM' | 'JH' | 'SH' | 'OPEN' | null` 欄位（寢技分組用）
- **後端業務邏輯**：
  - `backend/src/utils/teamSort.ts` — 排序時納入 tier
  - `backend/src/utils/scoring.ts` — 排名群組鍵改為 `category × tier`
  - `backend/src/utils/creativeScoring.ts` — 國小組超時/不足不扣分
  - `backend/src/controllers/eventController.ts` — `/rankings` 與 `/summary` 端點群組計算邏輯
  - `backend/src/controllers/flowController.ts` — 國小低/中年級單輪流程、單隊組別停用 next-group、A→B→C 自動推進
  - `backend/src/controllers/vrScoreController.ts` — 國小組（EL/EM/EH）禁用 VR 提交
  - `backend/src/controllers/wrongAttackController.ts` — 國小組（EL/EM/EH）禁用錯誤攻擊
- **前端元件**：
  - `frontend/src/app/features/admin/` — 賽會類型選擇、隊伍匯入欄位加入 tier、Excel 範本更新、成績匯出依新分組
  - `frontend/src/app/features/sequence-judge/` — 國小組流程分支、單隊組別按鈕停用
  - `frontend/src/app/features/vr-judge/` — 國小組停用 UI
  - `frontend/src/app/features/audience/` — 二級分組標籤、單隊隱藏 R/G
  - `frontend/src/app/features/match-audience/` — 同上
  - `frontend/src/app/features/creative-scoring-judge/` — 國小組創意演武不顯示超時警告
  - `frontend/src/app/features/match-management/` — 寢技建立場次時依組別套用預設時間
- **API 與 Socket.IO**：
  - 既有 Socket.IO 事件 payload 新增 `tier` 欄位（`team:abstained`、`group:changed`、`round:changed`、`match:started` 等）
  - 不新增事件名稱
- **既存「宜蘭縣運動會」相容性**：
  - `competitionType` 預設為 `sports-day`，舊資料遷移腳本將既有 events 標記為 `sports-day`、teams 的 `tier` 留空
  - 所有國小組差異規則僅在 `tournament` 賽會生效，運動會賽會行為完全不變
