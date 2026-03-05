## Context

創意演武（Show）系統目前有完整的計時、評分、違例扣分流程，但缺少「棄權」功能。對照雙人演武（Duo）的 `/flow/abstain` 與 `/flow/abstain-cancel` 路由，創意演武使用獨立的路由前綴 `/creative/flow/`，故需新增對應端點。

匯出功能現有 Admin 元件中的 Excel（XLSX）與 PDF 生成邏輯，已包含 `penaltyDeduction` 欄位，但未顯示違例類型明細（如：超時、使用道具、實際攻防）。

## Goals / Non-Goals

**Goals:**
- 賽序裁判可對當前選中隊伍設定棄權，棄權狀態廣播至所有端（計分裁判、觀眾）
- 棄權可取消，取消後恢復正常賽程狀態
- 棄權隊伍在排名中不計入，在 UI 各端顯示「棄權」標記
- Admin 匯出 Excel / PDF 時，若有違例扣分顯示扣分原因（類型 + 金額）

**Non-Goals:**
- 棄權不影響已提交的評分資料（不刪除 CreativeScore 紀錄）
- 不新增獨立的棄權歷史查詢端點
- 不修改雙人演武（Duo）的棄權流程

## Decisions

### 棄權狀態儲存於 CreativeGameState

棄權狀態以 `isAbstained: Boolean` 欄位儲存在 `CreativeGameState`，對應當前 `currentTeamId` 的隊伍。取消棄權時將欄位設為 `false`。

替代方案：在 `Team` model 新增 `abstained` 欄位。不選擇此方案，因為棄權屬於「當前賽程狀態」而非隊伍靜態資料，且避免跨 model 聯查。

### 棄權 API 獨立於 /creative/flow 路由

新增 `POST /creative/flow/abstain` 與 `POST /creative/flow/abstain-cancel`，與現有流程端點同前綴，保持路由一致性。允許角色：`sequence_judge`、`admin`。

### Socket.IO 事件命名

- 棄權廣播：`creative:team-abstained`，payload `{ eventId, teamId }`
- 取消棄權廣播：`creative:team-abstain-cancelled`，payload `{ eventId, teamId }`

前端 SocketService 新增 `creativeTeamAbstained$` 與 `creativeTeamAbstainCancelled$` Observable。

### getCreativeState 回傳 isAbstained

`GET /creative/flow/state/:eventId` 回應新增 `isAbstained: boolean` 欄位，讓頁面重載時各端可還原棄權狀態。

### 匯出扣分原因：在現有 penalty 欄位旁加附註欄

Excel：在「扣分總計」欄後新增「扣分原因」欄，格式為逗號分隔文字（如：「超時 -1.0、使用道具 -1.0」）。

PDF：在得分列的扣分數字旁加括號說明（如：`-2.0 (超時, 使用道具)`）。

違例類型標籤沿用前端既有的 `PENALTY_LABEL` 對應表（overtime→超時、undertime→未達時間、props→使用道具、attacks→實際攻防）。

## Risks / Trade-offs

- [風險] `CreativeGameState` 的 `isAbstained` 欄位在換組（nextTeam）時需重置為 `false`，否則下一組會繼承棄權狀態 → 在 `nextTeam` controller 的 update 操作中加入 `isAbstained: false` 重置
- [風險] `getCreativeState` 在前端 `loadState` 中被多個元件呼叫（賽序裁判、記分裁判），需確保新欄位不破壞既有型別介面 → 使用可選欄位 `isAbstained?: boolean`，預設為 `false`
- [取捨] 匯出時違例原因文字依賴後端 `CreativePenalty` 資料，若賽後清除成績再匯出則無法顯示 → 此為預期行為，符合「清除即清除」語義
