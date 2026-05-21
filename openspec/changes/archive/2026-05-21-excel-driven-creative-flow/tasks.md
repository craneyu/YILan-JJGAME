## 1. 後端：nextTeam 加 isTournament 分支

- [x] 1.1 `backend/src/controllers/creativeFlowController.ts` `nextTeam` 加入 `isTournament` 分支：tournament 用 `[...allTeams].sort((a, b) => a.order - b.order)`、sports-day 沿用 `sortTeams + resolveCategoryOrder('Show')`。其餘「找下一個未完賽 + 未棄權」邏輯保留。驗收：對 mock 9 隊 tournament event 模擬 nextTeam 9 次，序列符合 Excel 列順序
- [x] 1.2 D1: 沿用 Duo 變更的「事件條件分支」模式 — 驗證 isTournament 條件正確、sports-day 路徑零變更
- [x] 1.3 D2: 不引入「群組」概念 — 確認 nextTeam 仍是線性掃描，不建構 (tier, category) 群組
- [x] 1.4 D3: 不修改 admin UI（已自動受 Duo 變更覆蓋）— 確認 admin 對 tournament event 仍然看不到 categoryOrderShow 拖曳區塊（在 excel-driven-flow 已隱藏整個 categoryOrder block）

## 2. 驗證

- [x] 2.1 撰寫 `verify-creative-flow.ts` 驗證腳本，覆蓋：buildTeamSort pure-function 對 9 隊 tournament 排序、nextTeam 9 步推進完整序列、第 10 步回傳 `nextTeamId: null`、sports-day 對照測試（9 隊不同分布走 category-major）
- [x] 2.2 D1 驗證：sports-day 9 隊（3 female + 4 male + 2 mixed）模擬 nextTeam 序列為 female 3 隊 → male 4 隊 → mixed 2 隊，與本變更前完全一致

## 3. Spec 對照

- [x] 3.1 Requirement 'Sequence judge advances to the next team' MODIFIED 內容反映 tournament + sports-day 雙路徑（依賴：1.1, 2.1）
- [x] 3.2 design.md 章節「行為變更（使用者可觀察）」對應 tournament 走 Excel-row 推進、sports-day 走 category-major
- [x] 3.3 design.md 章節「資料介面」對應實作：無 schema 變更
- [x] 3.4 design.md 章節「失敗模式」對應實作：nextTeamId=null 由前端處理
- [x] 3.5 design.md 章節「驗收條件」4 條由 2.1 驗證腳本涵蓋
- [x] 3.6 design.md 章節「範圍邊界」in-scope 項全部在 §1-§2 task 內；out-of-scope（計時器、棄權、評分、罰則）不出現於本變更任何 task
