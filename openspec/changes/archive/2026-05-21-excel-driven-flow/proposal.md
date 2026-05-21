## Why

`jujitsu-tournament-expansion` 變更已歸檔後，承辦人員在閱讀使用手冊時發現流程模型與實際需求不符：當時設定為「同 tier 內 R1 全部 category 跑完 → R2 → R3」（tier-major × round-major），但實際比賽現場期望是「同一隊跑完所有輪次後才換下一隊」，且群組順序應該完全依匯入的 Excel 列順序，不需要 admin 額外設定。本變更正式記錄此調整。

## What Changes

- **錦標賽 nextGroup 流程改為「Excel-driven, 每隊完整跑完所有 round 才換下一隊」**：
  - 群組執行順序 = (tier, category) 在匯入 Excel 中首次出現的列順序，自動合併不連續列
  - 同 (tier, category) 群組內，依 team.order 升冪逐隊
  - EH/JH/SH/OPEN：同隊依序跑 R1 → R2 → R3，每輪可能含 VR 評分閘門（JH/SH/OPEN）才推進到下一輪
  - EL/EM：維持單輪連續演練（actionProgress 含 A+B 全部動作，跑完即換下一隊）
- **錦標賽完全拿掉 categoryOrder 設定**：admin 介面隱藏「組別順序」拖曳 UI；承辦人員直接調整 Excel 列順序即可控制進場順序
- **Sports-day（運動會）行為完全不變**：保留既有 sortTeams + category-major round-cycling 流程，無向後相容風險
- **單隊組別 400 guard 已移除**（前一變更已實作，本變更保留並驗證）
- **新增 buildTournamentGroups() helper**：純函式建構錦標賽的 (tier, category) 群組執行序列，便於測試與重用

## Non-Goals

- 不改動 sports-day 賽會任何行為（向後相容絕對保證）
- 不改動 EL/EM 國小低/中年級單輪連續演練模型
- 不改動 VR 評分的時機條件（JH/SH/OPEN 仍須每輪 VR；EL/EM/EH 仍免 VR）
- 不改動計分演算法、排名計算、觀眾顯示 R/G 隱藏規則
- 不新增 Socket.IO 事件、不改 Mongoose schema

## Capabilities

### New Capabilities

（無——本變更為既有 capability 的流程修訂）

### Modified Capabilities

- `single-team-group-flow`: 多輪流程模型從 tier-major × round-major 改為 (tier, category) Excel-row order × per-team-rounds-first
- `tournament-team-grouping`: 排序與群組建構規則加入「Excel-row first appearance」說明
- `admin-dashboard`: 錦標賽不再顯示 categoryOrder 拖曳設定 UI

## Impact

- **後端**：
  - `backend/src/utils/teamSort.ts` 新增 `buildTournamentGroups()` 函式
  - `backend/src/controllers/flowController.ts` `nextGroup` 重寫狀態機（錦標賽分支採新邏輯，sports-day 分支保留舊邏輯）
- **前端**：
  - `frontend/src/app/features/admin/admin.component.html` 包覆 `@if (!isTournament())` 隱藏錦標賽的「組別順序」設定 UI
- **文件**：
  - 新增 `SPEC/錦標賽規格需求/手冊_雙人傳統演武.html`（單檔 HTML 操作手冊）
  - 既有 `SPEC/錦標賽規格需求/SPEC-v3.md` §3.5.1 中關於排序與推進規則的描述已過時，需於 archive 時同步修訂

## 實作狀態

本變更的程式碼已於 commit `d00b217` 提前實作並通過 19/19 端對端驗證（17 隊完整 35 步流程 + sports-day 15 步回歸 + 單隊組別 + 空群組）。本 Spectra change 為事後正式追蹤該調整。
