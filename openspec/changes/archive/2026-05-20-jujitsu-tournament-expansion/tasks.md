## 1. 後端資料模型與工具函式（基礎層）

- [x] [P] 1.1 Event Model 新增 `competitionType: 'sports-day' | 'tournament'` 欄位（default `'sports-day'`）。驗收：Mongoose schema 載入既有 events 後 `.competitionType` 自動填為 `'sports-day'`；新建 `POST /api/v1/events` body 帶 `competitionType: 'tournament'` 能正確持久化
- [x] [P] 1.2 Team Model 新增 `tier: 'EL' | 'EM' | 'EH' | 'JH' | 'OPEN' | 'ELEM' | null` 欄位（default null）。驗收：既有運動會 teams 載入後 `tier === null`；錦標賽 teams 必填且僅接受六種代碼之一（schema enum 驗證）
- [x] [P] 1.3 Match Model 新增 `tier: 'ELEM' | 'JH' | 'OPEN' | null` 欄位（寢技用）。驗收：既有寢技 match 載入後 `tier === null`；錦標賽寢技 match 必填
- [x] 1.4 新增 `backend/src/utils/tournament.ts`，提供 `isElementaryTier(tier)`、`getElementaryMotions(tier, series)`、`getNeWazaDefaultDurationSeconds(tier)` 三個 helper。驗收：撰寫單元測試覆蓋全部六個 tier × 三個 series 的回傳值對應到 SPEC-v3.md §3.1 表格

## 2. 後端：排名群組與計分邏輯

- [x] 2.1 `utils/teamSort.ts` 排序時納入 tier 作為次要鍵（category 主、tier 次）。驗收：對 mock teams 排序後同 category 內依 tier 順序 EL→EM→EH→JH→OPEN→ELEM 排列
- [x] 2.2 `utils/scoring.ts` 排名計算群組鍵改為 `${category}:${tier ?? 'none'}`。驗收：sports-day event（全 tier=null）排名結果與本變更前完全一致；tournament event 產生獨立 `(category, tier)` 排名群組
- [x] 2.3 `controllers/eventController.ts` `/rankings` 端點回應每筆 ranking 加 `tier` 欄位。驗收：API 回應 JSON schema 通過手動驗證，tournament event 每筆 ranking 含 `tier` 字串、sports-day 含 `tier: null`
- [x] 2.4 `controllers/eventController.ts` `/summary` 端點新增 `singleTeamGroups: Record<string, boolean>` 欄位（key 為 `${category}:${tier ?? 'none'}`）。驗收：對含混合多隊與單隊群組的 tournament event 呼叫 summary，回應 `singleTeamGroups` 正確標示哪些群組只有一隊
- [x] 2.5 `utils/creativeScoring.ts` 國小組（EL/EM/EH）跳過超時/不足時間扣分。驗收：對 tier=EL 且時間 30 秒超時的 input 計算結果不含 -1 扣分；對 tier=JH 相同 input 仍含 -1 扣分

## 3. 後端：流程控制與驗證

- [x] 3.1 `controllers/flowController.ts` 開放動作端點依 `currentTeam.tier` 決定可開放的動作集合，超出 `getElementaryMotions(tier, series)` 的呼叫回 400。驗收：對 tier=EL 的隊伍開放 A2 回 400「該組別無此動作」；開放 A1 / B1 成功
- [x] 3.2 `controllers/flowController.ts` 國小低/中年級單輪流程：A 系列最後一動作評分完成後，next-action 自動指向 B1（不需中間「換輪」步驟）。驗收：tier=EM 隊伍完成 A2 評分後查 `/flow/state/:eventId`，`nextAction` 應為 `'B1'`
- [x] 3.3 `controllers/flowController.ts` 單隊組別自動 A→B→C 推進：JH/OPEN 單隊群組 A 系列 + VR-A 完成後，next-action 自動指向 B1。驗收：單隊 male JH 完成 A4 + VR-A 後，`/flow/state` 的 nextAction 為 B1
- [x] 3.4 `controllers/flowController.ts` next-group 端點對單隊組別回 400 並訊息「此組別僅一隊，無下一組可換」。驗收：對單隊組別呼叫 `POST /flow/next-group` 回 400
- [x] 3.5 `controllers/vrScoreController.ts` 國小組（EL/EM/EH）禁用 VR 提交。驗收：對 tier=EM 隊伍提交 VR score 回 400「Elementary tier teams do not receive VR scoring」
- [x] 3.6 `controllers/wrongAttackController.ts` 國小組禁用錯誤攻擊標記/取消。驗收：對 tier=EL 隊伍呼叫 wrong-attacks 端點回 400
- [x] 3.7 `controllers/matchController.ts` 寢技 match 建立時依 tier 套用預設 `matchDuration`（ELEM=120、JH=180、OPEN=300）。驗收：分別建立三種 tier 的寢技 match，持久化文件的 `matchDuration` 對應正確

## 4. 後端：隊伍匯入

- [x] 4.1 隊伍匯入端點對 tournament events 強制驗證每列 `tier` 欄位存在且為合法代碼，缺欄位/非法值回 400 並列出問題列號。驗收：對 tournament event 匯入缺 tier 欄位的 Excel 回 400 且 error 內含問題列號清單
- [x] 4.2 隊伍匯入端點對 sports-day events 忽略 tier 欄位（若 Excel 有此欄）。驗收：對 sports-day event 匯入帶 tier 欄位的 Excel 成功，所有 teams 的 tier 為 null

## 5. 前端：管理員

- [x] [P] 5.1 Event 建立表單加入賽會類型選擇（運動會 / 錦標賽 radio），預設運動會。驗收：手動建立兩種類型的 event，列表頁分別顯示
- [x] [P] 5.2 Event 列表卡片顯示賽會類型 badge（運動會 / 錦標賽）。驗收：列表頁兩種 event 都能正確顯示對應 badge
- [x] [P] 5.3 Team 匯入頁面對 tournament event 顯示 tier 欄位需求說明 + 提供新版 Excel 範本下載連結。驗收：開啟 tournament event 的匯入頁能下載含 tier 欄位的範本
- [x] 5.4 成績匯出邏輯改為依 `(category, tier)` 拆分 Excel/PDF 檔案（tournament events），檔名格式 `{category}_{tier}.xlsx`/`pdf`。驗收：對含 male EH/JH 與 female OPEN 的 tournament event 匯出，產生三份檔案；對 sports-day event 匯出仍是依 category 的單份檔案命名不變
- [x] 5.5 成績匯出對國小組（EL/EM/EH）省略 VR 欄位（VR_A / VR_B / VR_C / throwVariety / groundVariety），grand total 公式不含 VR。驗收：開啟 `男子組_國小低年級.xlsx` 不存在任何 VR 欄位；`男子組_國高中.xlsx` 仍有 VR_A/B/C

## 6. 前端：裁判介面

- [x] [P] 6.1 賽序裁判介面依 `currentTeam.tier` 過濾動作按鈕可見性（不在 `getElementaryMotions` 集合的按鈕不渲染）。驗收：手動操作 tier=EL 隊伍只看到 A1、B1 按鈕；tier=EM 隊伍看到 A1、A2、B1、B2
- [x] [P] 6.2 賽序裁判介面對單隊組別將「換組」按鈕套用 `.disabled-btn` class 並停用 click handler。驗收：對單隊組別操作介面，換組按鈕灰底且點擊無反應
- [x] [P] 6.3 賽序裁判介面對單隊 JH/OPEN 群組顯示「下一動作」推進按鈕（A1→A2→...→B1→B2...），不顯示「換輪」按鈕。驗收：手動跑單隊 JH 完整流程，UI 全程無「換輪」按鈕
- [x] [P] 6.4 VR 裁判介面對 tier=EL/EM/EH 的當前隊伍顯示 disabled 提示「此組別不需要 VR 評分」，所有評分按鈕與錯誤攻擊按鈕停用。驗收：切換到國小組隊伍時 UI 進入 disabled 狀態
- [x] [P] 6.5 創意演武計分裁判介面對國小組隱藏/停用超時/不足時間警告指示（其他罰則按鈕維持可用）。驗收：對 tier=EL 隊伍的創意演武頁面無超時警告 UI 元素

## 7. 前端：觀眾顯示

- [x] [P] 7.1 演武觀眾頁頂部標籤渲染「`{CATEGORY} {TIER} R{round}-G{group}`」格式，tier=null 時跳過 tier 段（運動會行為不變）。驗收：tournament `MALE JH R1-G2`、sports-day `MALE R1-G2`、混合場景顯示正確
- [x] [P] 7.2 演武觀眾頁對單隊組別隱藏 `R{round}-G{group}` 段（依 summary 端點的 `singleTeamGroups` map 判定）。驗收：單隊 male EH 群組顯示 `MALE EH`、多隊 male JH 顯示 `MALE JH R1-G2`
- [x] [P] 7.3 演武觀眾頁排名表依 tier 渲染對應動作欄位數（EL: A1/B1、EM: A1/A2/B1/B2、EH: A1-A3/B1-B3/C1-C3、女子/混合 JH/OPEN: A1-A3/B1-B3/C1-C3、男子 JH/OPEN: A1-A4/B1-B4/C1-C4、sports-day: 沿用原邏輯）。驗收：對各種 tier+gender 組合的 ranking table 截圖比對欄位數正確
- [x] [P] 7.4 寢技/對打/格鬥觀眾頁頂部標籤加入 tier 顯示（tournament 寢技顯示 `MALE ELEM`、其他類別不變）。驗收：tournament 寢技觀眾頁顯示 tier 標籤

## 8. 驗收與回歸測試

- [x] 8.1 既有運動會回歸測試：建立一場運動會 event（含 5 男子隊、3 女子隊、3 輪 A/B/C），完整跑完 Duo + Creative + Ne-Waza + Fighting + Contact 全流程；計分、排名、觀眾顯示、匯出全部與本變更前的截圖/JSON 逐欄比對一致
- [x] 8.2 錦標賽 EL 單隊完整流程：建立 tournament event 加 1 隊 male EL，跑 A1→B1 流程；驗證 VR/錯誤攻擊按鈕全程停用、觀眾顯示為 `MALE EL`（無 R/G）、排名表只顯示 A1/B1 欄位、匯出檔名 `男子組_國小低年級.xlsx` 且無 VR 欄位
- [x] 8.3 錦標賽 JH 多隊完整流程：建立 tournament event 加 4 隊 female JH（A/B/C 各 3 動作），跑完 3 輪輪轉 + VR 評分；驗證觀眾顯示 `FEMALE JH R1-G2`、排名表顯示 A1-A3/B1-B3/C1-C3 + VR_A/B/C、3 輪 round:changed 事件正確廣播
- [x] 8.4 寢技預設時間驗收：對 tournament event 建立三種寢技 match（ELEM/JH/OPEN），確認 Match.matchDuration 分別為 120/180/300；裁判端 UI 顯示 2:00/3:00/5:00；裁判可手動調整為其他值並正確啟動
- [x] 8.5 創意演武罰則驗收：對 tournament event tier=EL 隊伍超時 30 秒，計分結果不含 -1 扣分；同 event tier=JH 隊伍超時 30 秒仍扣 -1；對 sports-day event 超時 30 秒仍扣 -1
- [x] 8.6 匯出檔案結構驗收：tournament event（含 male EH + male JH + female OPEN）匯出產生三份 Excel + 三份 PDF；sports-day event（含 male + female + mixed）匯出仍是三份依 category 的單份檔案，檔名與內容與本變更前一致

## 9. Spec Requirement Coverage 對照（每條 requirement 對應的實作驗收任務）

每條任務的「Requirement」標示對應的 spec 條文名稱，「依賴任務」列出實際實作工作所在；勾選此任務代表該 requirement 的 implementation + verification 已完成並通過驗收。

- [x] 9.1 Requirement "Event distinguishes competition type" 完整實作與驗收（依賴：1.1 schema、8.1 既有運動會回歸）
- [x] 9.2 Requirement "Team carries a tier (age/level) classification under tournament events" 完整實作與驗收（依賴：1.2 schema、4.1 匯入驗證）
- [x] 9.3 Requirement "Ranking groups partition by category and tier" 完整實作與驗收（依賴：2.2 utils/scoring 群組鍵、2.3 API 回應）
- [x] 9.4 Requirement "Ne-Waza match carries tier classification" 完整實作與驗收（依賴：1.3 Match schema 欄位）
- [x] 9.5 Requirement "Elementary tier teams have constrained motion sets per series" 完整實作與驗收（依賴：1.4 helper、3.1 後端驗證、6.1 前端按鈕過濾）
- [x] 9.6 Requirement "Elementary tier teams skip VR judging" 完整實作與驗收（依賴：3.5 vr-scores 端點、3.6 wrong-attacks 端點、6.4 VR UI、8.2 驗收）
- [x] 9.7 Requirement "EL and EM teams perform under single-round continuous flow" 完整實作與驗收（依賴：3.2 flow next-action、8.2 驗收）
- [x] 9.8 Requirement "EH teams retain three-round rotation" 完整實作與驗收（依賴：8.3 驗收 3 輪 round:changed 廣播）
- [x] 9.9 Requirement "Audience ranking table for EL and EM hides C series columns" 完整實作與驗收（依賴：7.3 前端欄位渲染）
- [x] 9.10 Requirement "Event creation form offers competition type selection" 完整實作與驗收（依賴：5.1 admin 表單）
- [x] 9.11 Requirement "Event model includes competition type field" 完整實作與驗收（依賴：1.1 schema）
- [x] 9.12 Requirement "Event list distinguishes competition type" 完整實作與驗收（依賴：5.2 admin badge）
- [x] 9.13 Requirement "Elementary tier teams exempt from creative time penalty" 完整實作與驗收（依賴：2.5 creativeScoring、6.5 裁判 UI、8.5 驗收）
- [x] 9.14 Requirement "Ne-Waza default match duration depends on tier under tournament events" 完整實作與驗收（依賴：3.7 matchController、8.4 驗收）
- [x] 9.15 Requirement "Audience display header includes tier label for tournament events" 完整實作與驗收（依賴：7.1 演武觀眾、7.4 match 觀眾）
- [x] 9.16 Requirement "Ranking table omits unused motion columns based on tier" 完整實作與驗收（依賴：7.3）
- [x] 9.17 Requirement "Results export splits files by category and tier for tournament events" 完整實作與驗收（依賴：5.4、8.6 驗收）
- [x] 9.18 Requirement "Tournament export omits VR columns for elementary tier groups" 完整實作與驗收（依賴：5.5、8.2 驗收）
- [x] 9.19 Requirement "System detects single-team groups under tournament events" 完整實作與驗收（依賴：2.4 summary 端點）
- [x] 9.20 Requirement 'Sequence judge disables "next team" button for single-team groups' 完整實作與驗收（依賴：3.4 後端拒絕、6.2 前端停用 button）
- [x] 9.21 Requirement "Series advance automatically within single-team groups for JH, SH, and OPEN tiers" 完整實作與驗收（依賴：3.3 flow 推進、6.3 前端不顯示換輪按鈕；§13 將擴充 SH 覆蓋）
- [x] 9.22 Requirement "Audience display hides R and G labels for single-team groups" 完整實作與驗收（依賴：7.2 觀眾頂部）
- [x] 9.23 Requirement "Multi-team groups preserve existing rotation behavior" 完整實作與驗收（依賴：8.3 多隊 JH 驗收、8.1 運動會多隊回歸）

## 10. Design Decision Coverage 對照（design.md 決策 → 實作任務）

- [x] 10.1 D1: `competitionType` 放在 Event Model，不放在 User 或 Session — 驗證 Event Model 欄位設計（依賴：1.1）
- [x] 10.2 D2: `tier` 為 Team 的一等欄位，預設 `null` — 驗證 Team/Match schema 欄位（依賴：1.2、1.3）
- [x] 10.3 D3: 排名群組鍵改為 `(category, tier)`，群組計算邏輯集中於 `utils/scoring.ts` — 驗證群組計算與排序（依賴：2.1、2.2）
- [x] 10.4 D4: 國小組差異規則統一以 `isElementaryTier(tier)` 判斷 — 驗證所有 elementary 邏輯統一引用此 helper（依賴：1.4 + 3.1/3.2/3.5/3.6 全部後端 controller）
- [x] 10.5 D5: 國小低/中年級單輪流程不引入新 GameState status，沿用既有 `action_open/closed/series_complete` — 驗證 GameState enum 未變更（依賴：3.2）
- [x] 10.6 D6: 單隊組別判定由後端計算後放在 `/summary` 回應中 — 驗證 `singleTeamGroups` map（依賴：2.4）
- [x] 10.7 D7: 觀眾顯示標籤組合改為 `{category} {tier} R{round}-G{group}` — 驗證所有觀眾頁標籤格式（依賴：7.1、7.2、7.4）
- [x] 10.8 D8: 既有 specs 以 delta 形式新增 Requirement，不修改既有條文 — 驗證 6 個 modified specs 皆採 ADDED Requirements（已在規格層面完成）

## 11. Design 章節覆蓋（design.md 章節 → 實作任務）

- [x] 11.1 design.md「行為（使用者可觀察）」章節：所有列舉的使用者可觀察行為皆由 8.1–8.6 驗收任務涵蓋
- [x] 11.2 design.md「資料介面」章節：Event/Team/Match Model 欄位 + API 回應 schema（依賴：1.1、1.2、1.3、2.3、2.4）
- [x] 11.3 design.md「失敗模式」章節：所有後端 400 拒絕路徑（依賴：3.1、3.4、3.5、3.6、4.1）
- [x] 11.4 design.md「驗收條件」章節：6 條驗收條件對應 8.1–8.6 任務
- [x] 11.5 design.md「範圍邊界」章節：tasks.md 完整列舉 in-scope；out-of-scope（柔術技、運動會行為調整）不出現於任何 task

## 12. 追加範圍：拆分 JH 為「青少年國中組」+ 新增 SH「青少年高中組」

- [x] 12.1 `backend/src/models/Team.ts` TeamTier 列舉新增 `'SH'`，enum 也需加入。驗收：新增 tier=SH 的隊伍能正確 save/load；既有 tier=JH 不受影響
- [x] 12.2 `backend/src/models/Match.ts` MatchTier 列舉新增 `'SH'`，enum 也需加入。驗收：建立 tier=SH 的寢技 match 能正確持久化
- [x] [P] 12.3 `backend/src/utils/tournament.ts`：`getNeWazaDefaultDurationSeconds(tier)` 對 SH 回傳 180；`groupKey` / `getTeamMotionSequence` 對 SH 走和 JH 相同的非國小路徑（無需新增條件）。驗收：單元測試 SH 回傳 180、`getTeamMotionSequence` 對 male SH 回 A1-A4/B1-B4/C1-C4
- [x] [P] 12.4 `backend/src/controllers/teamController.ts` `parseTier` + `TIER_LABEL_MAP`：新增「青少年國中」「青少年高中」「SH」「JH」中英文同義詞映射；JH 對應 label 改為「青少年國中組」。驗收：匯入帶「分級=青少年高中組」的 Excel 列能正確解析為 SH
- [x] [P] 12.5 `frontend/src/app/features/admin/admin.component.ts` `TIER_LABEL` + `TIER_ORDER`：新增 `SH: '青少年高中組'`，JH label 改為「青少年國中組」，TIER_ORDER 插入 SH 於 JH 之後。驗收：排名卡片標題顯示「男子組 × 青少年高中組」；匯出檔名 `{event}_男子組_青少年高中組_成績明細.xlsx`
- [x] [P] 12.6 `frontend/src/app/features/audience/audience.component.ts` + `vr-judge.component.ts` + `sequence-judge.component.ts` + `creative-sequence-judge.component.ts`：四個 TeamTier 型別宣告處加上 `'SH'`。驗收：TypeScript strict 編譯通過；UI 對 tier=SH 行為與 JH 一致（VR 可用、3 motions/series for female/mixed、4 for male、非單輪流程）
- [x] [P] 12.7 `frontend/src/app/features/admin/admin.component.ts` `downloadTeamImportTemplate`：分級對照工作表新增「SH」「青少年高中組」對照列；「JH」對應中文 label 改為「青少年國中組」。驗收：下載範本第二張工作表含 7 列（EL/EM/EH/JH/SH/OPEN/ELEM）
- [x] 12.8 `SPEC/錦標賽規格需求/SPEC-v3.md`：§1.2、§2.2、§2.3、§5.2、§9 表格全部把「國高中組」改為「青少年國中組」並增加「青少年高中組」列；§5.2 寢技預設時間表 SH 設為 3 分鐘。驗收：grep `國高中組` 在 SPEC-v3.md 應僅剩規格修訂歷史的脈絡說明（如有）；新增的 SH 表格列完整
- [x] 12.9 驗收：建立 tournament event，匯入 5 隊（含 2 隊 SH 男子、1 隊 JH 女子、2 隊 OPEN 混合），跑完傳統演武評分、寢技排程；確認排名分為三個 (category, tier) 群組、SH 寢技預設 180 秒、SH 觀眾頂部顯示 `MALE SH`、匯出產生三份 Excel
- [x] 12.10 D9: JH 重新定義為「青少年國中組」+ 新增 SH「青少年高中組」（追加範圍）— 驗證 TeamTier / MatchTier 列舉新增 'SH'、Ne-Waza 預設 SH=180s、既有 JH 資料語意自動切換為「青少年國中組」無需 migration（依賴：12.1、12.2、12.3、12.8）

## 13. 追加範圍：sort priority 改 tier 主、nextGroup 改 (tier, category, round) 狀態機

- [x] 13.1 `backend/src/utils/teamSort.ts` 兩處修正：(a) `TIER_ORDER` 補 `'SH'`，完整為 `['EL', 'EM', 'EH', 'JH', 'SH', 'OPEN', 'ELEM']`；(b) `sortTeams` 排序鍵從 `category → tier → order` 改為 `tier → category → order`。驗收：對 mock 17 隊資料排序後，序列與 design.md D10 §狀態機簡述列出的順序逐筆相符；sports-day 隊伍（全部 tier=null）排序輸出與本變更前完全一致
- [x] 13.2 `backend/src/controllers/flowController.ts` `nextGroup` 重寫為 `(tier, category, round, teamIdx)` 狀態機：（a）同 `(tier, category, round)` 內換下一隊；（b）EL/EM 跨完整序列後跳到同 tier 下一非空 category；（c）EH/JH/SH/OPEN 同 category 內 round R 完成所有隊 → 同 tier 換下一 category（同 round R）；（d）同 tier 所有 category R 跑完 → 同 tier round R+1 第一個 category；（e）同 tier round=3 全部跑完 → 換下一非空 tier 第一個 category, round=1；（f）所有 tier 跑完 → status=event_complete。驗收：以 17 隊資料按既定 categoryOrder=`female→male→mixed` 模擬完整呼叫鏈，最終共 17 + (EH+JH+SH+OPEN 群組數 × 2 輪換) 次 nextGroup 呼叫無 400 錯誤
- [x] 13.3 `backend/src/controllers/flowController.ts` 移除單隊組別 nextGroup 400 guard（先前 D6 加入的「此組別僅一隊，無下一組可換」分支）。驗收：對單隊組別在動作 + VR 完成後呼叫 next-group 應成功並推進到下一非空 `(tier, category)`；中途呼叫仍能由前端 `canNextGroup` 防呆
- [x] 13.4 nextGroup 自動跳過空 `(tier, category)` 群組：例如 EL-female 0 隊則直接從 EL-male 開始；換 tier 時也跳過全 tier 無隊伍者。驗收：對含「至少一個空群組」+「至少一個整 tier 為空」的測試資料呼叫 nextGroup 不會卡住在空群組
- [x] 13.5 更新 `specs/single-team-group-flow/spec.md` MODIFIED Requirement 對應實作：前端 `sequence-judge.canNextGroup` 對單隊組別在動作完成 + VR 條件滿足後 enable「換組」按鈕（先前實作會永遠 disable）。驗收：對單隊組別 EH 完整 A→B→C 跑完 + 三輪 VR 送出後，「換組」按鈕應為 enabled 狀態
- [x] 13.6 自動驗證腳本：載入使用者實際 17 隊資料（`/Users/hao/Documents/柔術/115錦標賽/比賽賽程/Duo-teams_115錦標賽.xlsx` 結構），逐筆模擬 nextGroup 呼叫並 assert 每步的 `(tier, category, round, teamId)` 對應 design.md D10 列出的 17-step 流程表。驗收：腳本通過、無 400 / event_complete 過早觸發
- [x] 13.7 D10: 演武排序改為 tier 主、category 次；nextGroup 改採 (tier, category, round) 狀態機（追加範圍）— 驗證 sort priority swap、TIER_ORDER 補 SH、nextGroup 新狀態機、單隊 guard 移除四項全部到位（依賴：13.1、13.2、13.3、13.4、13.5）
