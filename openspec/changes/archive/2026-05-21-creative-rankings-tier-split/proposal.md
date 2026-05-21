## Summary

錦標賽創意演武排名與成績匯出，依 `(category, tier)` 細分群組，與雙人演武對齊；運動會（sports-day）仍維持單一 category 分組不變。

## Motivation

「錦標賽 7 分級擴充」change（archived 2026-05-20 `jujitsu-tournament-expansion`）已將雙人演武（Duo）與寢技排名／匯出依 `(category, tier)` 拆分，但**創意演武（Show）排名遺漏**：

- 後端 `creativeRankingsController.ts` 只依 `['female','male','mixed']` 各跑一次排名，回傳資料不含 `tier`。
- 前端 `admin.component.ts` 的 `creativeRankingsByCat` 只依 `category` 分群。
- `exportCreativeExcel(category)` 也只依 category 匯出，無 tier 拆分。

實際影響：錦標賽結束時，若同一性別組內有不同年齡分級隊伍（例如女子組同時有國小低年級與公開組），會被混在同一張排名表 / 同一份匯出檔。例如國小低年級女選手與公開組女選手會被合算，第一名可能完全不公平。

Team schema 與匯入流程已寫入 `tier` 欄位（沿用既有 7 級 enum），資料層準備就緒，只需補上排名／匯出邏輯。

## Proposed Solution

對齊 Duo 的既有實作模式：

1. **後端 `creativeRankingsController.ts`**：
   - `TeamRankEntry` interface 加 `tier: string | null` 欄位。
   - 排名迴圈改為對 tournament 事件先以 `(category, tier)` 群組 partition，每群獨立 sort + rank；sports-day 維持只依 category 群組（tier 視為 null 單一群組）。
   - 棄權隊伍 rank=0 規則不變。

2. **前端 `admin.component.ts`**：
   - 沿用 Duo 既有 `rankingsByCat` 的 `(category, tier)` keying 邏輯（line 209-216 模式），套用至 `creativeRankingsByCat`。
   - `CategoryCreativeRanking` interface 加 `tier: TeamTier | null` 與 `tierLabel: string`。
   - sports-day 事件 tier 為 null，行為與既有相同；tournament 事件依 `(category, tier)` 分群。

3. **前端 `exportCreativeExcel(category, tier?)`**：
   - 簽名擴增 tier 參數；tournament 事件以 `(category, tier)` 取一群匯出，檔名依「Results export splits files by category and tier for tournament events」spec 既有規則：`${categoryLabel}_${tierLabel}.xlsx`（例：`女子組_國小低年級.xlsx`）。
   - sports-day 維持 `${categoryLabel}.xlsx`。

4. **HTML 排名顯示**：
   - tournament 事件群組 label 顯示「女子組 ｜ 國小低年級組」格式（沿用既有 Duo `rankingsByCat` 的 label 風格）。
   - sports-day 維持只顯示 category label。

## Non-Goals

- 不變更觀眾端（`creative-audience`、`audience`）的計分顯示邏輯；觀眾頁本來就不顯示排名表。
- 不變更 `creative-rankings` API 路徑或 HTTP method；只新增 response 欄位。
- 不修改棄權、扣分計算邏輯；只變更分組維度。
- 不擴充 PDF 匯出（既有 spec 只規範 Excel 匯出 + PDF 但 PDF 在程式中可能尚未實作；本 change 只跟著既有 PDF 程式狀態走，不新增 PDF 功能）。
- 不變更 Duo（雙人演武）的排名／匯出（已正確）。

## Alternatives Considered

- **(a) 後端不變、前端自行依 tier 拆分**：拒絕 — 後端不回 tier 欄位的話前端無法分組；且與 Duo 模式不一致。
- **(b) 新增獨立 `/creative-rankings-by-tier` 端點**：拒絕 — Duo 也沒走這條路，沿用同一端點加欄位最一致。

## Impact

- Affected specs: `admin-dashboard`（MODIFIED 既有「Admin can view creative embu rankings」加上 tier 維度）
- Affected code:
  - Modified:
    - backend/src/controllers/creativeRankingsController.ts（TeamRankEntry 加 tier、tournament 分組依 (category, tier)）
    - frontend/src/app/features/admin/admin.component.ts（CategoryCreativeRanking 介面加 tier 與 tierLabel、creativeRankingsByCat 分群邏輯改變、exportCreativeExcel 簽名加 tier 參數、模板 label 顯示）
    - frontend/src/app/features/admin/admin.component.html（排名群組 label 顯示 tier、export 按鈕傳入 tier）
  - New: (none)
  - Removed: (none)
- Bundle 影響：邏輯調整，無新增套件，預估 < 2kB。
- Socket / API：API response 加新欄位（向後相容，既有客戶端可忽略）；無 socket 變更。
