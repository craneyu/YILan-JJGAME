## 1. 後端：群組建構與流程狀態機

- [x] 1.1 `backend/src/utils/teamSort.ts` 新增 `buildTournamentGroups(teams)` 純函式：依 `team.order` 升冪走訪、依 (tier, category) 首次出現順序建群組、不連續同 (tier, category) 列自動合併。驗收：連續/不連續兩種 case 各通過單元測試
- [x] 1.2 `backend/src/controllers/flowController.ts` `nextGroup` 加入 `isTournament` 分支：錦標賽走新狀態機（per-team-rounds-first × Excel-row group order），sports-day 完整保留既有 category-major rotation
- [x] 1.3 錦標賽分支內：EH/JH/SH/OPEN 隊伍在 currentRound < 3 時呼叫 nextGroup → 同隊推進到 currentRound+1 並廣播 roundChanged；EL/EM 直接換到下一隊
- [x] 1.4 錦標賽分支內：currentTeam 為群組最後一隊且已跑完所有 round → 換到下一非空 (tier, category) 群組的第一隊，round=1；無下一群組則 status=event_complete
- [x] 1.5 VR 檢查跳過條件保留：tournament + isElementaryTier(EL/EM/EH) 跳過 VR 檢查，JH/SH/OPEN 仍須當前 round VR

## 2. 前端：admin 介面隱藏錦標賽 categoryOrder UI

- [x] 2.1 `frontend/src/app/features/admin/admin.component.html` 用 `@if (!isTournament())` 包覆「組別順序」設定區塊（含 edit-mode 與 display-mode）。驗收：tournament event 不顯示該區塊；sports-day event 顯示如舊

## 3. 文件

- [x] 3.1 新增 `SPEC/錦標賽規格需求/手冊_雙人傳統演武.html`：含 §1-§9 完整章節、3 張內嵌 SVG 流程圖、操作指引、115 錦標賽實例與 FAQ

## 4. 驗證

- [x] 4.1 撰寫驗證腳本 verify-new-flow.ts，覆蓋 8 大區段共 19 個 checks
- [x] 4.2 D1: nextGroup 採事件條件分支而非完全重設計 — 驗證錦標賽與 sports-day 兩條獨立路徑共存
- [x] 4.3 D2: buildTournamentGroups 依 Excel-row 首次出現決定群組順序 — 17 隊產生 12 個群組
- [x] 4.4 D3: EH 多輪但無 VR — 驗證 EH 4 隊資料庫無 VRScore、ranking 無 vrScore 欄位、nextGroup 不卡 VR
- [x] 4.5 D4: 錦標賽 admin 隱藏 categoryOrder UI — tournament 不渲染、sports-day 仍渲染
- [x] 4.6 Spec coverage：MODIFIED requirement "Multi-team groups preserve existing rotation behavior" 新內容完整反映 per-team-rounds-first 流程

## 5. Spec Requirement / Design Coverage 對照

- [x] 5.1 Requirement 'Multi-team groups preserve existing rotation behavior' 完整驗收（依賴：1.2, 1.3, 1.4, 4.1, 4.2）
- [x] 5.2 Requirement 'Series advance automatically within single-team groups for JH, SH, and OPEN tiers' 完整驗收（依賴：1.3, 4.1）
- [x] 5.3 Requirement 'Sequence judge disables "next team" button for single-team groups' 完整驗收（依賴：1.4, 4.5）
- [x] 5.4 Requirement 'Tournament event execution order follows Excel row sequence' 完整驗收（依賴：1.1, 4.3）
- [x] 5.5 Requirement 'Tournament events hide category order configuration UI' 完整驗收（依賴：2.1, 4.5）
- [x] 5.6 design.md D1: nextGroup 採「事件條件分支」而非「state machine 重設計」（依賴：1.2, 4.2）
- [x] 5.7 design.md D2: 錦標賽群組建構採「Excel-row 首次出現決定順序、自動合併不連續列」（依賴：1.1, 4.3）
- [x] 5.8 design.md D3: EH 多輪 tier 但無 VR（依賴：1.5, 4.4）
- [x] 5.9 design.md D4: 錦標賽 admin 介面隱藏「組別順序」設定（依賴：2.1, 4.5）
- [x] 5.10 design.md 章節「行為變更（使用者可觀察）」對應 1.3、1.4、2.1 三個直接 user-facing 修改
- [x] 5.11 design.md 章節「資料介面」對應實作：無 schema 變更（驗證 Team/Match Models 與既有相同）
- [x] 5.12 design.md 章節「失敗模式」對應實作：EL/EM/EH 跳過 VR 檢查、JH/SH/OPEN 仍 403、單隊不再 400（依賴：1.5）
- [x] 5.13 design.md 章節「驗收條件」7 條全部由 4.1 verify-new-flow.ts 19/19 checks 涵蓋
- [x] 5.14 design.md 章節「範圍邊界」in-scope 項全部在 §1-§3 task 內；out-of-scope（觀眾、寢技、對打、格鬥）不出現於本變更任何 task
