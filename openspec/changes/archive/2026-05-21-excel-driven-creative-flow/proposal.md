## Why

`excel-driven-flow` 變更已將雙人傳統演武（Duo）的賽程推進改為依 Excel 列順序執行，但雙人創意演武（Show）仍使用舊有的 `sortTeams + resolveCategoryOrder('Show')` 排序——這代表錦標賽承辦人員需要：(a) 在 Excel 內排好隊伍順序、(b) 還要在系統中設定「組別順序 Show」，**規則不一致而且容易出錯**。本變更把創意演武對齊 Duo 的設計：tournament 一律依 Excel 列順序；sports-day 保留既有 category-major 行為（向後相容）。

## What Changes

- **錦標賽創意演武 nextTeam 改為依 Excel 列順序**：
  - `creativeFlowController.nextTeam` 加入 `isTournament` 分支：tournament 使用 `[...allTeams].sort((a, b) => a.order - b.order)`；sports-day 保留 `sortTeams + resolveCategoryOrder('Show')`
  - 線性找下一個未完賽（5 位裁判全送出即視為完賽）+ 未棄權的隊伍
- **創意演武介面（admin / sequence judge）的隊伍列表也對齊新排序規則**：
  - admin / sequence-judge 顯示隊伍順序以 Excel order ascending（tournament）為準
  - sports-day 不變
- **撰寫 9 隊端對端驗證腳本**：用使用者提供的 `Show-teams_115錦標賽.xlsx`（9 隊）模擬完整 9 步推進，驗證執行順序與 Excel 列吻合

## Non-Goals

- 不改動創意演武的計分演算法（技術分 + 藝術分、去頭尾取中間 3）
- 不改動既有的時間罰則邏輯（國小組免時間罰則已在 `jujitsu-tournament-expansion` 完成）
- 不改動計時器、棄權、評分介面、觀眾顯示
- 不引入 round 概念到創意演武（其本來就是單次表演）
- 不影響 sports-day 創意演武行為（向後相容）
- 不修改 Mongoose schema 或 Socket.IO 事件

## Capabilities

### New Capabilities

（無——本變更為既有 capability 的流程修訂）

### Modified Capabilities

- `creative-embu-flow`: 錦標賽 nextTeam 改為依 Excel 列順序（team.order 升冪），sports-day 保留 category-major

## Impact

- **後端**：`backend/src/controllers/creativeFlowController.ts` `nextTeam` 加入 `isTournament` 分支
- **前端**：
  - `frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts` 隊伍列表顯示順序（若使用 sortTeams，tournament 改用 order 升冪）
  - admin 介面已隱藏 categoryOrderShow UI（隨 Duo 變更 categoryOrder 區塊整體包覆完成，無需再改）
- **文件**：手冊新增「創意演武流程」小節或獨立檔；SPEC-v3.md 同步更新
- **驗證**：寫腳本用 9 隊資料模擬完整流程

## 實作策略

本變更走完整 Spectra 流程：建立 change → 寫 artifacts → archive → 由 `/spectra:apply` 觸發實作。預估實作工作量極小（單一函式分支 + 驗證腳本），約 30 分鐘。
