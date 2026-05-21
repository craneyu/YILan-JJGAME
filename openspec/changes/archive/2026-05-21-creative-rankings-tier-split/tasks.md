# Tasks

## 1. 後端排名分組擴增

- [x] 1.1 更新 `backend/src/controllers/creativeRankingsController.ts`：實作需求「Admin can view creative embu rankings」的後端拆分。`TeamRankEntry` interface 新增 `tier: string | null`。在 `getCreativeRankings` 內先 `Event.findById(eventId).lean()` 判斷 `meetingType`，tournament 時對 `results` 以 `(category, tier)` 群組 partition；sports-day 時維持只依 `category` partition（每筆 entry 的 tier 設 null）。每筆 entry 結果 mapping 階段就把 `tier: team.tier ?? null` 寫入。棄權隊伍 rank=0 規則不變。驗證：(a) 對 sports-day 事件 GET `/events/:id/creative-rankings` 回 JSON 中 `data[].tier` 皆為 null、原 rank 順序不變；(b) 對 tournament 事件回 JSON 中同 `(category, tier)` 內 rank 由 1 重新編號，跨 tier 各自獨立。

## 2. 前端排名分群與顯示

- [x] 2.1 [P] 更新 `frontend/src/app/features/admin/admin.component.ts`：實作需求「Admin can view creative embu rankings」的前端分群。`CreativeRankingItem` interface 加 `tier: TeamTier | null` 欄位（沿用既有 `TeamTier` import）。`CategoryCreativeRanking` interface 加 `tier: TeamTier | null` 與 `tierLabel: string`。`creativeRankingsByCat` 改為：tournament 時以 `(category, tier)` 為 key 分群、sports-day 時以 `(category, null)` 為 key（仿照既有 Duo `rankingsByCat` 在 line 209-216 的 keying 邏輯）。每群輸出含 category label 與 tier label（tier label 沿用既有中文對照：KID→幼兒組、EL→國小低年級組、…OPEN→公開組）；sports-day 與 tier=null 時 tier label 為空字串。驗證：`npx tsc --noEmit` 通過。
- [x] 2.2 更新 `frontend/src/app/features/admin/admin.component.ts` 的 `exportCreativeExcel`：簽名改為 `exportCreativeExcel(category: string, tier: TeamTier | null = null)`。內部過濾 `creativeRankingsByCat()` 改為比對 `g.category === category && g.tier === tier`。標題與檔名：tournament 時 `${event.name} — ${categoryLabel} ${tierLabel} 創意演武成績` 與 `${categoryLabel}_${tierLabel}.xlsx`；sports-day 時維持原 `${categoryLabel} 創意演武成績` 與 `${categoryLabel}.xlsx`。驗證：sports-day 事件匯出檔名仍為 `女子組.xlsx`；tournament 事件女 EL 群組匯出檔名為 `女子組_國小低年級.xlsx`。
- [x] 2.3 更新 `frontend/src/app/features/admin/admin.component.html` 的創意演武排名區塊：群組標題顯示「`{categoryLabel}` ｜ `{tierLabel}`」（仿照既有 Duo rankings 顯示風格；sports-day 或 tier=null 時不顯示 ｜ tierLabel）。「匯出 Excel」按鈕 click handler 改為傳入 `group.category` 與 `group.tier`。驗證：tournament 事件畫面看到三個女子組群組（EL、OPEN、…）獨立顯示；sports-day 事件畫面只看到三組（女/男/混）。

## 3. 整合驗證

- [x] 3.1 手動 E2E 驗證：用既有 tournament 事件（例如「TEST-錦標賽-v2」或新建一個含 Show 隊伍且分多 tier 的測試 event）。確認 admin 排名頁顯示每個 `(category, tier)` 獨立群組、各群內 rank 從 1 開始、匯出按鈕在每群獨立、檔名含 tier 標識。
- [x] 3.2 回歸驗證：用 sports-day 事件（例如「115年宜蘭縣運動會『柔術』」）。確認創意演武排名仍是 3 個 category 群組（女/男/混）、各群內 rank 正確、匯出檔名為 `女子組.xlsx`（無 tier 後綴）。
- [x] 3.3 TypeScript 與 build 檢查：`cd backend && npx tsc --noEmit` 與 `cd frontend && npx tsc --noEmit && npm run build` 全部通過。
