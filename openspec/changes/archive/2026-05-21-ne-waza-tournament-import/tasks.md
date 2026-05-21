# Tasks

## 1. 後端資料模型擴充

- [x] 1.1 更新 `backend/src/models/Match.ts`：`MatchTier` 從 `"ELEM" | "JH" | "SH" | "OPEN"` 改為 `"KID" | "EL" | "EM" | "EH" | "JH" | "SH" | "OPEN"`；同步更新 schema 的 `enum` 陣列。新增 `MatchSource` interface 與 `redSource`/`blueSource` schema fields（皆 optional、預設 null、含 `fromMatchNo: Number(min:1)` 與 `resolved: Boolean(default:false)`）。驗證：`npx tsc --noEmit` 通過、`Match.create({ tier: "KID", redSource: { fromMatchNo: 3, resolved: false }, ... })` 可成功儲存且 `findOne` 回讀正確。
- [x] 1.2 更新 `backend/src/utils/tournament.ts`：`NE_WAZA_DEFAULT_SECONDS` 補 KID=90、EL=120、EM=120、EH=120（移除 ELEM）。實作需求「Ne-Waza default match duration depends on tier under tournament events」的新預設秒數表。驗證：用 vitest 或臨時 node 腳本對每個新 tier 呼叫 `getNeWazaDefaultDurationSeconds()` 得到對應秒數。
- [x] 1.3 [P] 新增 seed script `backend/src/seeds/migrateNeWazaTier.ts`：列出所有 `tier === "ELEM"` 的 Match 文件（matchType="ne-waza"），輸出 matchNo / category / weightClass / redPlayer.name 並支援 `--dry-run` 與 `--map <ELEM>=<EL|EM|EH>`（一次一個對應）批次更新。驗證：對開發 DB 執行 `--dry-run` 印出筆數；若有 ELEM 場次，套用 `--map ELEM=EL` 後 `Match.find({ tier: "ELEM" }).count()` 為 0。

## 2. 後端匯入驗證與 propagation

- [x] 2.1 新增 `backend/src/utils/matchPropagation.ts`：實作需求「Match winner propagation to downstream sourced matches」的核心邏輯。提供 `propagateMatchWinner({ eventId, completedMatchNo, winnerName, winnerTeamName })` async 函式。內部用 `Match.find` 找出符合 `redSource.fromMatchNo === N && !redSource.resolved` 或 `blueSource.fromMatchNo === N && !blueSource.resolved` 的下游場次；每筆呼叫 `Match.updateOne` 寫入 winner name/teamName 並把對應 side.resolved 改為 true。回傳 `[{ matchId, side }]` 陣列給 controller 廣播用。驗證：unit test 涵蓋三情境 — (a) 單筆下游、(b) 多筆下游、(c) 全已 resolved 時回傳空陣列。
- [x] 2.2 [P] 更新 `backend/src/sockets/index.ts`：新增 `broadcast.matchAdvancementResolved(eventId, payload)` 函式，payload 型別 `{ matchId, side: "red" | "blue", playerName, teamName, fromMatchNo }`。驗證：`npx tsc --noEmit` 通過、`broadcast` 物件 key 含 `matchAdvancementResolved`。
- [x] 2.3 更新 `backend/src/controllers/matchController.ts` 的 `updateMatch`：偵測 `match.status` 由非 completed 變為 completed 且 `match.result?.winner` 已設定時，在 `await match.save()` 後呼叫 `propagateMatchWinner()`，把回傳陣列逐筆呼叫 `broadcast.matchAdvancementResolved()`（實作需求「Match winner propagation to downstream sourced matches」與「Referee can complete a bye match directly without timer」）。同時實作需求「Match status transitions follow a strict lifecycle」的 bye 例外：`pending → completed` 允許但僅限 `match.isBye === true && match.bluePlayer.name === ""`，否則沿用既有 `VALID_TRANSITIONS` 邏輯。驗證：API integration test — (a) 建立 bye match → PATCH pending→completed 成功；(b) 建立非 bye match → PATCH pending→completed 回 409；(c) 完賽含 redSource 引用的下游場次 → 下游 player.name 更新且 socket payload 觸發。
- [x] 2.4 更新 `backend/src/controllers/matchController.ts` 的 `bulkCreateMatches`：實作需求「Admin can create matches via CSV/Excel import」的後端接收端。tier 必填驗證改用新 7-tier enum（將既有錯誤訊息「ELEM / JH / OPEN」改為「KID / EL / EM / EH / JH / SH / OPEN」）；接受 request body 內含 `redSource` 與 `blueSource` 欄位並寫入 schema；移除「require tier for tournament ne-waza」的硬性檢查若 frontend 已帶（保留錯誤回應的 message 在缺漏時觸發）。驗證：手動 POST 87 筆寢技測試資料含分級/source/bye，全部 201 created 且 DB 內欄位正確。

## 3. 前端匯入解析器

- [x] 3.1 [P] 新增 `frontend/src/app/core/utils/matchImport.ts`：純 TypeScript util 提供 `parseTierLabel(label: string): MatchTier | null`（含 7 個中文標籤對應表）、`parsePlacementPlaceholder(name: string): number | null`（regex `^\s*(\d+)\s*勝\s*$`，不允許 A 前綴；若偵測到 `A{N}勝` 回傳特殊錯誤碼）、`parseMatchRow(row): ParsedMatch | { error: string }`。驗證：unit test 涵蓋全部 7 個 tier label、placement 合法格式、A 前綴拒絕、bye 偵測（藍方空白）、缺少場次序拒絕。
- [x] 3.2 [P] 更新 `frontend/src/app/core/models/match.model.ts`：新增 `MatchSource` 介面與 `redSource?`、`blueSource?` 欄位於 `Match` interface；更新 `MatchTier` type 為 7 級新 enum；新增 `MatchAdvancementResolvedEvent` 介面（matchId/side/playerName/teamName/fromMatchNo）。驗證：`npx tsc --noEmit` 通過。
- [x] 3.3 更新 `frontend/src/app/features/admin/match-management/match-management.component.ts` 的 `parseAndImport`：實作需求「Admin can create matches via CSV/Excel import」於前端解析端。取消既有 `matchNo: i + 1`，改呼叫 `parseMatchRow` 取得結構化欄位（含 tier code、redSource、blueSource、isBye）。錯誤行先 collect 顯示 SweetAlert2 list（包含行號與錯誤訊息），不影響有效行匯入。下載匯入範本（`downloadTemplate`）也要加上「分級」欄與 `{N}勝` 範例。驗證：用使用者實際 Excel `寢技賽程匯入範本_115錦標賽.xlsx` 一鍵匯入 87 筆全部成功；DB 內 sample 場次（例如 matchNo=16）的 redSource = `{ fromMatchNo: 3, resolved: false }`。

## 4. 前端即時 socket 與 placeholder 渲染

- [x] 4.1 [P] 更新 `frontend/src/app/core/services/socket.service.ts`：新增 `matchAdvancementResolved$` Observable 訂閱 socket 事件 `match:advancement-resolved`；payload 型別來自 match.model.ts。驗證：`npx tsc --noEmit` 通過、`socket.service.ts` exports list 包含新 observable。
- [x] 4.2 新增 `frontend/src/app/core/utils/matchDisplay.ts`：提供 `displayPlayerName(player, source): { text, isPlaceholder }` helper（依設計 D6）。驗證：unit test 涵蓋 resolved=false（回 placeholder）、resolved=true（回實際姓名）、source=null（回實際姓名）。
- [x] 4.3 更新 `frontend/src/app/features/admin/match-management/match-management.component.html`：實作需求「Match list shows placeholder for unresolved sourced players」。列表選手姓名/隊名欄位改用 `displayPlayerName()` helper；placeholder 套用 `class="text-white/40 italic"`。元件 `.ts` 訂閱 `socket.matchAdvancementResolved$`，event 進來時 update local `matches` signal 對應 row。驗證：瀏覽器手動測試 — admin 匯入後場次 16 紅方欄顯示「3 勝者」灰色斜體；裁判端把場次 3 完賽後，admin 畫面場次 16 紅方欄即時變為「陳冠茗 Jabari」。
- [x] 4.4 [P] 更新 `frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts` 與 html：實作需求「Referee can complete a bye match directly without timer」與「Match list shows placeholder for unresolved sourced players」於裁判端。match 列表用 `displayPlayerName()` 渲染；訂閱 `matchAdvancementResolved$`；在 status='pending' 且 isBye=true 且 bluePlayer.name='' 時，「紅方勝」按鈕直接 enabled，按下時 PATCH `{ status: 'completed', result: { winner: 'red', method: 'judge' } }`。其餘場次保留既有流程（start-match → in-progress → 評分 → completed）。驗證：(a) bye 場次按一下完賽且觸發 propagation；(b) 一般場次仍須開始比賽才能設勝負（紅方勝按鈕在 pending 狀態 disabled）；(c) bye 場次完賽後場次列表此筆狀態變 completed 並上鎖。
- [x] 4.5 [P] 更新 `frontend/src/app/features/match-audience/match-audience.component.ts`：實作需求「Audience display receives socket events for real-time updates」之新事件 `match:advancement-resolved` 訂閱。event 進來且 `matchId === 當前顯示的 match._id` 時，update local match signal 對應 side 的 playerName/teamName；不顯示時忽略。html 端用 `displayPlayerName` 渲染選手姓名（resolved=false 時觀眾端也顯示 placeholder，避免短暫空白）。驗證：觀眾頁顯示中的 Match #16 紅方為 "3 勝者"，後端完賽 Match #3 後 5 秒內觀眾頁紅方變為實際姓名。

## 5. 整合驗證

- [x] 5.1 手動 E2E 驗證：執行 `cd backend && npm run dev` 與 `cd frontend && npm start`，admin 上傳 `/Users/hao/Documents/柔術/115錦標賽/比賽賽程/寢技賽程匯入範本_115錦標賽.xlsx`（需先將 `A3勝` 改為 `3勝` 等 — 在 propose 階段已決議）。預期：87 筆全部匯入；場次列表展開「國小低年級組 –26 公斤級」群組可看到場次 3 與 16，場次 16 紅方為「3 勝者」灰字。
- [x] 5.2 手動 E2E 驗證 bye：admin 進場次 1（董子璿 vs 空白），確認場次 1 在裁判介面紅方勝按鈕直接 enabled、按下後場次 1 變 completed。
- [x] 5.3 手動 E2E 驗證 propagation：裁判把場次 3 設為紅方勝完賽，重新整理 admin 與觀眾頁，場次 16 紅方應自動顯示場次 3 紅方的選手姓名 + 隊名（陳冠茗 / Jabari），且不需重新整理 — 透過 socket 即時更新。
- [x] 5.4 既有 ne-waza 流程回歸：在「非 bye」場次驗證計時、scoring、傷停、押制、Shido、Full-IPPON 全部運作如舊；確認沒有副作用。
- [x] 5.5 TypeScript & build 檢查：`cd backend && npx tsc --noEmit` 與 `cd frontend && npx tsc --noEmit && npm run build` 全部通過。

## 6. 覆蓋對照

下表確保每個 spec requirement 與 design decision 都有 task 涵蓋，便於 apply 階段交叉檢查。

### Spec 需求 → Task 對照

- **Admin can create matches via CSV/Excel import**（jujitsu-match-management）→ tasks 2.4、3.1、3.3、5.1
- **Match status transitions follow a strict lifecycle**（jujitsu-match-management，bye → completed 例外）→ tasks 2.3、4.4、5.2
- **Match winner propagation to downstream sourced matches**（jujitsu-match-management）→ tasks 2.1、2.2、2.3、5.3
- **Ne-Waza default match duration depends on tier under tournament events**（ne-waza-scoring，KID/EL/EM/EH 新預設秒數）→ tasks 1.1、1.2、1.3
- **Referee can complete a bye match directly without timer**（ne-waza-scoring）→ tasks 2.3、4.4、5.2
- **Match list shows placeholder for unresolved sourced players**（match-schedule-management）→ tasks 4.2、4.3、4.4、5.1
- **Audience display receives socket events for real-time updates**（match-audience-display，新增 match:advancement-resolved 訂閱）→ tasks 4.5、5.3

### Design 決策 → Task 對照

- **D1：MatchTier 擴充為 7 級，移除 ELEM** → tasks 1.1、1.2、1.3、2.4
- **D2：晉級依賴用 redSource / blueSource 結構** → tasks 1.1、2.4、3.1、3.2
- **D3：Propagation 於 updateMatch 內同步觸發** → tasks 2.1、2.3
- **D4：匯入解析器抽到 utils/matchImport.ts**（前端路徑）→ tasks 3.1、3.3
- **D5：Bye 場次允許跳過計時直接判勝** → tasks 2.3、4.4、5.2
- **D6：UI placeholder 渲染** → tasks 4.2、4.3、4.4、4.5

### 行為（Observable Behaviour）對照

- 匯入流程（87 筆、tier 對應、{N}勝 解析、bye 偵測）→ tasks 3.1、3.3、5.1
- Propagation（一場完賽 → 下游 update + socket 廣播 + 冪等）→ tasks 2.1、2.2、2.3、5.3
- Bye 完賽（無計時、單按完賽、propagation 同步觸發）→ tasks 2.3、4.4、5.2

### 介面 / 資料形狀（Interface / Data Shape）對照

- Match schema 變更（MatchTier、MatchSource、redSource/blueSource）→ tasks 1.1、3.2
- Socket 事件（match:advancement-resolved payload）→ tasks 2.2、4.1
- utils/matchImport.ts 出口（前端 parseTierLabel / parsePlacementPlaceholder / parseMatchRow）→ task 3.1
- utils/matchPropagation.ts 出口（後端 propagateMatchWinner）→ task 2.1

### 失敗模式（Failure Modes）對照

- 缺「分級」欄、未知中文標籤 → tasks 3.1、3.3
- A{N}勝 舊格式拒絕 → tasks 3.1、3.3
- 場次序缺失或非正整數 → tasks 3.1、3.3
- 場次序重複（既有 409 沿用）→ task 2.4
- Propagation 對應下游已被刪除 → tasks 2.1（靜默忽略）
- 非 bye 場次試圖 pending → completed → task 2.3（後端狀態機拒絕）

### Acceptance 標準對照

- 87 筆寢技 Excel 一鍵匯入成功 → task 5.1
- 場次 16 紅方 placeholder 顯示 → tasks 4.3、5.1
- Bye 場次單按完賽 → tasks 4.4、5.2
- 第 2 回合 propagation 連鎖 → tasks 2.1、5.3
- 既有 ne-waza 流程不受影響 → task 5.4

### Scope 邊界對照

- In scope（寢技匯入、propagation、bye、MatchTier 擴充、ELEM seed 移轉）→ tasks 1.1–5.5 全範圍
- Out of scope（fighting/contact 匯入、觀眾佈局重繪、score 計算邏輯）→ 此 change 不含；於 task 5.4 回歸驗證以確認未誤動
