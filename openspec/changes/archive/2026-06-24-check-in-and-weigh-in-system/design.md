## Context

柔術競賽現場流程：報名 → 過磅（僅對打/寢技/格鬥）→ 檢錄 → 比賽。目前系統只覆蓋「比賽」階段，前兩階段由紙本與口頭協調，常見問題：

- 棄權 / 過磅失格的選手場次未即時調整，導致裁判進場後才發現另一方不存在。
- 演武項目雖不過磅，但檢錄未到仍須記錄並通知。
- 沒有單一畫面讓檢錄員看見全事件的選手狀態。

現有資料模型：
- `Team.members: string[]` —— 只記姓名，不帶狀態。
- `Match.isBye: boolean` 與 `redSource/blueSource` propagation 已支援「無對手→自動晉級」（見 `backend/src/utils/matchPropagation.ts` 與 `updateMatchPropagation.test.ts`）。
- 角色 enum 在 `User.ts` 內列舉：`scoring_judge | vr_judge | sequence_judge | match_referee | admin | audience`。

本 change 在不影響比賽計分主流程的前提下，加入「賽前資格管理」子系統。

## Goals / Non-Goals

**Goals:**

- 新增單一 `check_in_officer` 角色處理過磅與檢錄，admin 為超集。
- `Team.members` 升級為帶狀態的物件陣列，per-member 追蹤過磅與檢錄狀態。
- 過磅僅針對 fighting / ne-waza / contact 三項；演武選手 `weighInStatus = 'n/a'`。
- 失格 / 未到 SHALL 立即透過既有 `matchPropagation` 將該選手未來場次 bye 化並推進下游。
- 裁判場次詳情頁 SHALL 在紅藍方姓名旁顯示資格徽章。
- 演武團體計：team-level 檢錄狀態為「所有成員 `checkInStatus === 'present'`」的 derived 結果。

**Non-Goals:**

- 不新建 `Player` collection；狀態仍掛在 `Team.members[i]`，避免大型 schema migration。
- 不記錄體重數值；過磅僅紀錄 pass / fail 與原因。
- 不引入雙人簽核或審核流程。
- 不擴充 JWT payload（沿用 `{ userId, role, eventId? }`）。
- 不為本子系統新增 audit log（誰在何時改了誰）；若日後合規需要再開另一份 change。
- 不改變現有 Excel 匯入欄位格式；匯入後一律以預設狀態（pending 或 n/a）初始化。

## Decisions

### D1：狀態欄位掛在 `Team.members[i]`（拒絕新建 `Player` collection）

**Decision**：把 `Team.members` 由 `string[]` 升級為 `IMember[]`，加 `weighInStatus`、`checkInStatus`、`weighInAt`、`checkInAt`、`disqualifyReason` 五個欄位。

**Why**：
- 既有 ranking、export、import 流程都圍繞 Team 設計；引入 Player collection 需重寫多處 join，工程量過大。
- 同一隊員不會跨隊出現（重複姓名 import 時已會擋下），不需要跨 Team 共享 Player 實體。
- 維持資料局部性，一次讀 Team 即可完成檢錄頁渲染。

**Alternatives considered**：
- 新建 `Player` collection：拒絕，影響面過大。
- 用 parallel collection `MemberStatus` 用 `(teamId, memberIndex)` 索引：拒絕，多一次 join，且 atomic update 較複雜。

### D2：單一 `check_in_officer` role（拒絕拆過磅員與檢錄員）

**Decision**：新增一個 `check_in_officer` role，過磅與檢錄共用同一帳號與同一介面，僅以 tab 區分操作時點。

**Why**：使用者明確指示「過磅 / 檢錄可以是同一個」。權限切兩個 role 沒有實際隔離需求，徒增配置複雜度。

**Alternatives considered**：兩個 role（weigh_in_officer + check_in_officer）：拒絕。

### D3：演武團體狀態 = derived computed（拒絕另存 team-level 欄位）

**Decision**：Duo / Show 等演武 team 的「整隊檢錄完成」狀態，不存於 Schema，而由 backend response 計算：
```ts
teamCheckedIn = members.every(m => m.checkInStatus === 'present')
```
回應 DTO 帶上 `teamCheckedIn: boolean` 給前端使用。

**Why**：使用者明確指示「演武依隊伍計，因為一個人未到也是不算完成檢錄」。儲存 team-level 狀態會與個別成員狀態形成雙寫，難維持一致性；derived 避免不一致。

### D4：失格 / 未到立即 propagate（拒絕 batch / 手動觸發）

**Decision**：當 `weighInStatus → 'failed'` 或 `checkInStatus → 'absent'` 時，立即在同一個 controller 內：
1. 查找該選手在所有 `status: 'pending'` 的 match（依 `redPlayer.name === member.name && redPlayer.teamName === team.name` 或藍方同邏輯）。
2. 將該場 `isBye = true`、對方為勝、`result.method = 'dq'`、`status: completed`。
3. 對每場呼叫既有 `updateMatchPropagation(match)` 將勝者推進下游。
4. 廣播 `match:forfeit-applied` 帶被影響的 matchIds。

**Why**：使用者明確要求「立即 propagate」。批次處理或手動觸發會導致賽程顯示與真實狀態長時間不同步。

**Alternatives considered**：
- 只標記失格、不動 match：拒絕，違反需求。
- 由 admin 手動「套用 propagation」按鈕：拒絕，多一個容易遺漏的步驟。

### D5：匹配選手用 (name + teamName) 而非新增 memberId

**Decision**：失格 propagation 時，以 `(redPlayer.name === member.name && redPlayer.teamName === team.name)` 比對找到該選手所在場次。

**Why**：既有 match `redPlayer.name` 與 `team.members[i]` 是純字串，沒有 ID 連結；新加 memberId 又會影響 import 路徑。同事件內姓名唯一已由現有匯入驗證保證（CLAUDE.md 提到此約束）。

**Trade-off**：若使用者於 import 後改名（rename member），未來場次的 `redPlayer.name` 與 `team.members[i].name` 會脫鉤——此情境在現有 admin 流程下本來就會出問題，不在本 change 範圍。

### D6：過磅 status `n/a` 用於演武選手（拒絕用 null 或缺欄位）

**Decision**：演武類 team（`competitionType: 'Duo' | 'Show'`）的成員 `weighInStatus` 預設為 `'n/a'`，過磅 tab 不顯示這些成員。

**Why**：明確的 enum 值比 null 容易在前端條件渲染與型別檢查時處理；filter `weighInStatus !== 'n/a'` 直觀。

## Implementation Contract

### Behavior

1. **過磅 tab**：列出該事件所有 `matchType ∈ {fighting, ne-waza, contact}` 對應 team 的成員（用 Team.competitionType 不足以區分，需透過 join Match.matchType；若資料模型未有此關聯，則以 Team 的某欄位或顯式 `weighInStatus !== 'n/a'` 篩選）。每行顯示「選手姓名 / 隊伍 / 級別 / 當前狀態徽章 / [通過][失格] 按鈕」。
2. **檢錄 tab**：列出該事件所有 team 的成員。過磅失格者以灰階顯示並顯示「不需檢錄」標籤，不可操作。其餘成員顯示「[到場][未到] 按鈕」。
3. **狀態變更立即生效**：點擊任一按鈕後，前端 PATCH 對應端點；後端回傳成功後 socket 廣播 `participant:status-changed` 與（若有 match 被 bye 化）`match:forfeit-applied`。
4. **裁判介面**：紅方 / 藍方姓名旁顯示徽章：
   - `checkInStatus = present` 且 `weighInStatus ∈ {passed, n/a}` → ✅「已檢錄」
   - `weighInStatus = failed` → ❌「過磅失格」
   - `checkInStatus = absent` → ⛔「檢錄未到」
   - 其他（pending 狀態）→ ⚠️「未檢錄」

### Interface / data shape

**Mongoose IMember sub-schema**:
```ts
interface IMember {
  name: string;
  weighInStatus: 'pending' | 'passed' | 'failed' | 'n/a';
  checkInStatus: 'pending' | 'present' | 'absent';
  weighInAt?: Date;
  checkInAt?: Date;
  disqualifyReason?: string;
}
```

**新 controller 函式**：
```ts
// backend/src/controllers/checkInController.ts
listParticipants(req, res): Promise<void>       // GET /api/v1/events/:eventId/participants
setWeighIn(req, res): Promise<void>             // PATCH .../:teamId/:memberIndex/weigh-in
setCheckIn(req, res): Promise<void>             // PATCH .../:teamId/:memberIndex/check-in
```

**Forfeit propagation helper**：
```ts
// backend/src/utils/forfeitPropagation.ts
async function applyMemberForfeit(
  eventId: string,
  teamName: string,
  memberName: string,
  reason: 'weigh-in-failed' | 'check-in-absent',
): Promise<{ forfeitedMatchIds: string[]; propagatedMatchIds: string[] }>
```
內部呼叫既有 `updateMatchPropagation`。

**Socket 廣播 payload**：proposal 已列出，不重複。

### Failure modes

- 嘗試把已 `completed` 的 match bye 化 → SHALL 跳過該場且不報錯（log warning）。
- 重複呼叫 setWeighIn 把 already-failed 設為 failed → SHALL 是 idempotent no-op（不重複 propagate）。
- 取消失格（failed → passed）→ 本 change 不支援；回傳 HTTP 409「狀態變更不可逆，請聯絡 admin」。
- 無權限呼叫 → HTTP 403。

### Acceptance criteria

- 從零建立一個含 4 個 fighting 場次的事件，將某選手過磅失格 → 該選手所有 pending 場次 `isBye = true` 且對手勝出，下游若有引用該場 → 對手填入下游紅或藍方。
- 演武 Duo 隊伍兩位成員，其中一位 checkInStatus = absent → team-level derived `teamCheckedIn = false`，演武觀眾端與裁判端徽章顯示「未檢錄」。
- 裁判進入未檢錄選手的 fighting 場次 → 紅/藍姓名旁顯示「⛔ 檢錄未到」徽章。

### Scope

**In scope**：
- IMember schema migration script。
- /check-in 路由與檢錄頁元件。
- 後端三個 endpoints + forfeitPropagation util。
- 三個 referee component HTML 加徽章。
- check_in_officer role enum + seed user（checkin / checkin123）。

**Out of scope**：
- 體重數值記錄欄位。
- 失格復原流程。
- audit log。
- 過磅/檢錄通知（Line / Email 等外部通知）。

## Risks / Trade-offs

- **[Risk] Team.members migration 破壞既有 import / export 程式碼**
  → Mitigation：寫 migration script 一次性升級；既有 controller 內讀 `m.name` 之處改為若是物件取 `.name`、若是字串原樣使用——以 type guard 處理向後相容過渡期。Export Excel 模板繼續以姓名字串輸出。

- **[Risk] 同名選手在不同 team 衝突**
  → Mitigation：propagation 用 `(name + teamName)` 雙鍵比對；事件內姓名唯一已由現有 import 驗證保證。

- **[Risk] propagation 連鎖 bye 觸發大量寫入**
  → Mitigation：失格觸發以 transaction 包覆同事件的所有 bye + propagate，失敗整體回滾。LAN 環境下 MongoDB 7 支援 transaction，效能可接受（單次失格通常影響 ≤ 4 場）。

- **[Trade-off] 失格不可逆**
  → 由 admin 透過直接 PATCH `/api/v1/events/:id/participants/...` 或進入 admin 介面手動覆寫（admin 旁路守衛）。本 change 不暴露給 check_in_officer。

## Migration Plan

1. **新增 IMember sub-schema 並升級 TeamSchema**。
2. **撰寫 migration script** `backend/src/seeds/migrateMembersToObjects.ts`：
   - 掃描所有 Team 文件。
   - 若 `members[0]` 是 string，則 map 為 `IMember`，依 `competitionType` 決定 `weighInStatus`（Duo/Show → 'n/a'；其他或 null → 'pending'），其他狀態欄位設預設值。
   - 若已是物件型則跳過。
3. **新增 seed user** checkin / checkin123 / role check_in_officer。
4. **後端部署**：
   - 跑 migration script。
   - 重啟 backend。
5. **前端部署**：
   - 部署含 /check-in 頁面的 frontend build。
6. **驗證**：
   - 既有 ranking、import、export 端點回應與升級前相同（成員姓名字串輸出無變化）。
   - 新增的 /check-in 頁面對 check_in_officer 與 admin 帳號可達。

回滾策略：保留 migration 前的 mongodump backup；若部署後出問題，restore backup 並降版前端。
