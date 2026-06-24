## 0. 設計決策對應索引

以下列表把 design.md 的關鍵決策對應到實作 task，方便 review：

- **D1：狀態欄位掛在 `Team.members[i]`（拒絕新建 `Player` collection）** → 由 task 1.1、1.2、1.3 覆蓋（IMember sub-schema 與 migration）。
- **D2：單一 `check_in_officer` role（拒絕拆過磅員與檢錄員）** → 由 task 2.1、2.2、2.3、2.4、3.5 覆蓋（role enum 與守衛）。
- **D3：演武團體狀態 = derived computed（拒絕另存 team-level 欄位）** → 由 task 3.1、7.1、7.2 覆蓋（teamCheckedIn 在 GET endpoint derived，前端讀 derived 值）。
- **D4：失格 / 未到立即 propagate（拒絕 batch / 手動觸發）** → 由 task 3.2、3.3、4.1、4.2、4.3 覆蓋（同一 controller 內呼叫 forfeit util，transaction 包覆）。
- **D5：匹配選手用 (name + teamName) 而非新增 memberId** → 由 task 4.1 的 query 條件覆蓋（用 `'redPlayer.name' + 'redPlayer.teamName'` 雙鍵 query）。
- **D6：過磅 status `n/a` 用於演武選手（拒絕用 null 或缺欄位）** → 由 task 1.1（schema 預設）、1.2（migration 補 n/a）、5.3（weigh-in tab 過濾 n/a）共同覆蓋。

實作 Contract 對應：

- **Behavior**（操作可觀察結果） → 由 task 5.3、5.4、6.1–6.4、8.1–8.4 覆蓋（檢錄/裁判 UI 與端到端驗收）。
- **Interface / data shape**（IMember、controller、helper、socket payload） → 由 task 1.1、3.1–3.6、4.1 覆蓋。
- **Failure modes**（in-progress 跳過、idempotent、不可逆 409、autoplay 等） → 由 task 3.4、4.1（skippedMatchIds）、8.3 覆蓋。
- **Acceptance criteria**（4 場 fighting + redSource 端到端、Duo absent、裁判徽章） → 由 task 8.1、8.2 覆蓋。
- **Scope** in scope / out of scope 邊界 → out-of-scope 項目（體重數值、復原、audit log、通知）SHALL NOT 出現在任何 task；in-scope 由 1.x–7.x 全部 task 覆蓋。

## 1. 資料模型升級（實作 Requirement: Team.members stores per-member weigh-in and check-in status）

- [x] 1.1 為 Requirement「Team.members stores per-member weigh-in and check-in status」更新 Mongoose schema：在 `backend/src/models/Team.ts` 新增 `IMember` interface（`name: string; weighInStatus: 'pending' | 'passed' | 'failed' | 'n/a'; checkInStatus: 'pending' | 'present' | 'absent'; weighInAt?: Date; checkInAt?: Date; disqualifyReason?: string;`），並新增 `MemberSchema`；將 `TeamSchema.members` 由 `[String]` 改為 `[MemberSchema]`，預設值按 `competitionType` 決定（Duo/Show → weighInStatus: 'n/a'，其餘 → 'pending'）；驗證：以 mongosh 直接 insert 新 Team 文件，欄位帶預設值且 schema validation 通過
- [x] 1.2 撰寫一次性 migration script `backend/src/seeds/migrateMembersToObjects.ts`：iterate 所有 Team，若 `typeof members[0] === 'string'` 則 map 為 `IMember` 物件（依 competitionType 決定 weighInStatus 預設），其他狀態欄位設 'pending'，無 `weighInAt` / `checkInAt`；驗證：在開發 DB 跑一次，所有 Team 文件升級且演武 Team 的成員 weighInStatus === 'n/a'，原既有 ranking endpoint 回傳成員姓名仍可讀
- [x] 1.3 更新所有讀 `team.members[i]` 為字串的程式碼（grep `members\[`、`members\.`、`members\.map`、`members\.forEach`）改為讀 `team.members[i].name`；驗證：`cd backend && npm run dev` 啟動無 TS 編譯錯誤；既有 `GET /api/v1/events/:id/rankings` 回應包含成員姓名

## 2. 新增 check_in_officer role（實作 Requirement: check_in_officer role is a recognized user role across backend and frontend、Requirement: Role selection is limited to authenticated roles）

- [x] 2.1 為 Requirement「check_in_officer role is a recognized user role across backend and frontend」擴充 enum：在 `backend/src/models/User.ts` 的 role enum 加入 `'check_in_officer'`；在 `backend/src/middleware/auth.ts` 確認 `requireRole` 接受新 role；驗證：用 mongosh 建立 role: 'check_in_officer' 的 user 不報 schema 錯
- [x] 2.2 更新 `frontend/src/app/core/services/auth.service.ts` 的 `UserRole` 型別 union 加入 `'check_in_officer'`；驗證：`cd frontend && npm run build` 無 TS 錯誤
- [x] 2.3 在 `backend/src/seeds/initialUsers.ts` 加 seed user：`{ username: 'checkin', password: 'checkin123', role: 'check_in_officer' }`，bcryptHash 處理同其他種子帳號；驗證：清空 users collection 後跑 seed，可用 checkin / checkin123 透過 `POST /api/v1/auth/login` 登入並取得 JWT 含 `role: 'check_in_officer'`
- [x] 2.4 為 Requirement「Role selection is limited to authenticated roles」更新前端：在 admin 使用者管理頁的 role dropdown 加入「檢錄員」選項對應 `check_in_officer`；確認 dropdown 不出現 `audience`；驗證：手動進 admin 使用者管理頁，可選「檢錄員」並儲存成功

## 3. 後端 participant 端點（實作 Requirement: New check_in_officer role authorized for participant management endpoints、Requirement: Status transitions are persisted and broadcast in real time、Requirement: Disqualifying status changes are irreversible from check_in_officer role）

- [x] 3.1 [P] 為 Requirement「New check_in_officer role authorized for participant management endpoints」實作 GET：在 `backend/src/controllers/checkInController.ts` 撰寫 `listParticipants(req, res)`：以 `req.params.eventId` 查所有 Team，回傳每隊 `{ teamId, name, competitionType, tier, members: IMember[], teamCheckedIn: boolean }`，`teamCheckedIn` 為 derived `members.every(m => m.checkInStatus === 'present')`；驗證：`curl GET /api/v1/events/:id/participants` 帶 check_in_officer JWT 回 200，內容含 teamCheckedIn 欄位
- [x] 3.2 [P] 為 Requirement「Status transitions are persisted and broadcast in real time」實作 PATCH weigh-in：在 `checkInController.ts` 寫 `setWeighIn`：驗 `req.body.status ∈ {'passed', 'failed'}`，更新 `Team.members[memberIndex].weighInStatus` 與 `weighInAt = new Date()`，如帶 `reason` 寫入 `disqualifyReason`；存檔後呼叫 `broadcast.participantStatusChanged(eventId, payload)`，若 status === 'failed' 並呼叫 `applyMemberForfeit`；驗證：手動 PATCH 一次 weigh-in passed，再 PATCH failed，DB 對應欄位正確、socket 連線收到事件
- [x] 3.3 [P] 實作 PATCH check-in：在 `checkInController.ts` 寫 `setCheckIn`，邏輯同 3.2 但操作 `checkInStatus / checkInAt`；status === 'absent' 觸發 forfeit；驗證：同 3.2，PATCH check-in absent 後該選手的 pending 場次自動 bye 化
- [x] 3.4 為 Requirement「Disqualifying status changes are irreversible from check_in_officer role」實作不可逆守衛：在 `setWeighIn` / `setCheckIn` 內，當目前 status 為 `'failed'` / `'absent'` 且請求者 JWT role === `'check_in_officer'` 時回 HTTP 409 「狀態變更不可逆，請聯絡 admin」；admin role 不受限；驗證：以 check_in_officer 對已 failed 成員嘗試 PATCH passed 回 409，admin 對同一筆 PATCH 'pending' 回 200
- [x] 3.5 註冊路由 `backend/src/routes/checkIn.ts`：三個端點全部以 `verifyToken + requireRole('check_in_officer', 'admin')` 守衛；在 `backend/src/index.ts` mount `app.use('/api/v1/events/:eventId/participants', checkInRoutes)`；驗證：scoring_judge JWT call 三端點皆回 403
- [x] 3.6 在 `backend/src/sockets/index.ts` 新增 `broadcast.participantStatusChanged(eventId, payload)` 與 `broadcast.matchForfeitApplied(eventId, payload)` helper；驗證：grep 確認 helper 匯出，TypeScript 編譯通過

## 4. Forfeit propagation 工具（實作 Requirement: Forfeit propagation triggers when a member becomes ineligible、Requirement: Member ineligibility triggers automatic match forfeit and propagation）

- [x] 4.1 為 Requirement「Forfeit propagation triggers when a member becomes ineligible」撰寫 `backend/src/utils/forfeitPropagation.ts`：function `applyMemberForfeit(eventId, teamName, memberName, reason)`：用 mongoose transaction 包覆：(1) `Match.find({ eventId, status: 'pending', $or: [{ 'redPlayer.name': memberName, 'redPlayer.teamName': teamName }, { 'bluePlayer.name': memberName, 'bluePlayer.teamName': teamName }] })`；(2) 對每筆設 isBye=true、result={winner: 對方, method: 'dq'}、status: 'completed'；(3) 對每筆呼叫既有 `updateMatchPropagation`；(4) 回傳 `{ forfeitedMatchIds, propagatedMatchIds, skippedMatchIds }`；驗證：撰寫單元測試 `backend/src/utils/__test__/forfeitPropagation.test.ts` 模擬 multi-match 情境，斷言被影響的 match status 與 result 正確
- [x] 4.2 為 Requirement「Member ineligibility triggers automatic match forfeit and propagation」整合：在 `checkInController.setWeighIn` 與 `setCheckIn` 內，當 status 轉為 failed/absent 後呼叫 `applyMemberForfeit`，將回傳的 forfeitedMatchIds 與 propagatedMatchIds 透過 `broadcast.matchForfeitApplied` 廣播；skippedMatchIds 不廣播但放在 HTTP response body；驗證：端到端跑一次過磅失格，觀察觀眾端 / 裁判端 match 列表瞬間更新
- [x] 4.3 撰寫整合測試 `backend/src/utils/__test__/checkInForfeit.test.ts`：建立 4 場 fighting + 1 場 redSource 引用 → 一名選手過磅失格 → 斷言 3 場 pending 被 bye 化，下游 match 紅方更新；驗證：`npm test -- --include="checkInForfeit"` 通過

## 5. 前端檢錄頁面（實作 Requirement: Weigh-in tab shows only fighting, ne-waza, and contact participants、Requirement: Check-in tab lists all participants and disables operations on weigh-in-failed members）

- [x] 5.1 新增路由 `/check-in` 至 `frontend/src/app/app.routes.ts`，套 `roleGuard('check_in_officer', 'admin')`；驗證：用 check_in_officer 帳號登入後自動或可導向 /check-in
- [x] 5.2 在 `frontend/src/app/features/login/login.component.ts` 加入登入後依 role 跳轉：`check_in_officer → /check-in`；驗證：checkin/checkin123 登入後直接到 /check-in
- [x] 5.3 為 Requirement「Weigh-in tab shows only fighting, ne-waza, and contact participants」實作 weigh-in tab：建立 `frontend/src/app/features/check-in/check-in.component.{ts,html,css}`，使用 Standalone + OnPush；透過 `ApiService.get('/events/:id/participants')` 載入；用 signal `activeTab = signal<'weighin' | 'checkin'>('weighin')` 切換；weigh-in tab 過濾 `members.filter(m => m.weighInStatus !== 'n/a')`；按鈕 PATCH `.../weigh-in`；驗證：手動以 check_in_officer 操作，演武隊伍成員不出現在 weigh-in tab
- [x] 5.4 為 Requirement「Check-in tab lists all participants and disables operations on weigh-in-failed members」實作 check-in tab：列出所有 members；weighInStatus === 'failed' 的列用 `bg-white/5 text-white/30 italic` 並顯示「不需檢錄」靜態文字，且不渲染 `到場` / `未到` 按鈕；其他列渲染兩個按鈕；驗證：將某選手過磅失格後，切到 check-in tab 看見該選手灰階且無按鈕
- [x] 5.5 訂閱 `socket.participantStatusChanged$` 與 `socket.matchForfeitApplied$`：抵達時更新本地 participants signal；驗證：開兩個檢錄頁瀏覽器頁，A 頁操作通過/失格，B 頁 1 秒內同步看見新狀態徽章

## 6. 裁判介面顯示資格徽章（實作 Requirement: Referee match detail view displays participant eligibility badges）

- [x] 6.1 [P] 為 Requirement「Referee match detail view displays participant eligibility badges」實作徽章：在 `frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts` 內，於 `activeMatch` 載入時，同時 fetch `/events/:id/participants` 並建立 `Map<(name,teamName), IMember>` 的 lookup signal；在 component template 中，紅藍方姓名旁渲染徽章——根據查到的 IMember 套上 spec 表格的 label 與 class；查不到（如 bye 藍方）則不渲染；驗證：手動進入一場 fighting match，紅藍方姓名旁顯示對應徽章
- [x] 6.2 [P] 同樣的徽章邏輯套用 `frontend/src/app/features/fighting-referee/fighting-referee.component.{ts,html}`；驗證：fighting referee 場次詳情頁顯示徽章
- [x] 6.3 [P] 同樣套用 `frontend/src/app/features/contact-referee/contact-referee.component.{ts,html}`；驗證：contact referee 場次詳情頁顯示徽章
- [x] 6.4 三個 referee component 內訂閱 `socket.participantStatusChanged$`，事件抵達且 `(teamName, memberName)` 命中當前 match 任一方時，更新 lookup signal 觸發徽章重渲染；驗證：開裁判頁同時 + 檢錄頁，檢錄頁標選手到場 → 裁判頁徽章 1 秒內由「未檢錄」轉為「已檢錄」

## 7. 演武隊伍 derived 狀態（實作 Requirement: Team-level check-in status for Duo/Show is derived from member status）

- [x] 7.1 為 Requirement「Team-level check-in status for Duo/Show is derived from member status」實作回應 DTO：`listParticipants` 回傳時 per team 計算 `teamCheckedIn = members.every(m => m.checkInStatus === 'present')`；驗證：以 mongosh 構造 Duo team 一位 present 一位 absent，GET endpoint 回 `teamCheckedIn: false`；全部 present 時回 `true`
- [x] 7.2 在演武對應的 referee / audience 元件（creative-sequence-judge、audience 等）讀 teamCheckedIn 顯示徽章；確認單筆隊員未到時演武 audience 顯示「未檢錄」；驗證：演武隊伍中任一人 absent → 演武 audience 顯示「⛔ 檢錄未到」

## 8. 驗收

- [x] 8.1 端到端：建立含 4 場 fighting + 1 場 redSource 引用的事件；checkin 帳號操作某選手過磅失格；觀察該選手所有 pending 場次自動 bye 化，下游 match propagation 正確，broadcast 在所有觀眾端、裁判端、admin 端同步
- [x] 8.2 端到端：演武 Duo team 兩位成員，一位標 absent；audience 端顯示該隊「⛔ 檢錄未到」；admin match-management 該隊涉及場次仍維持原狀（演武無 match 機制，僅顯示徽章）
- [x] 8.3 失格不可逆：以 check_in_officer 試圖 revert 一筆 failed 回 passed → HTTP 409；以 admin 同樣操作 → 200
- [x] 8.4 既有功能 regression：跑既有的 ranking、export、import 流程，確認沒有因 members schema 升級而 break；`cd frontend && npm run build` 通過 bundle 限制檢查
