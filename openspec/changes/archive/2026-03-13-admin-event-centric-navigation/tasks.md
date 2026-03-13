## 1. 路由結構重組

- [x] 1.1 更新 `app.routes.ts`：各運動管理路由嵌套在 `/admin/events/:eventId/` 下（各運動管理路由嵌套在 `/admin/events/:eventId/` 下），`/admin` 根路由改為導向 `/admin/events`
- [x] 1.2 確認所有 `/admin/*` 子路由均套用 `roleGuard('admin')`（All admin routes require admin role）

## 2. 新增 EventListComponent 作為管理員入口

- [x] 2.1 建立 `frontend/src/app/features/admin/event-list/event-list.component.ts`（Standalone + OnPush），呼叫 `GET /api/v1/events` 並以 Signal 顯示賽會列表（Admin can view all events on a dedicated event list page）
- [x] 2.2 實作建立賽會表單（Admin can create a new event from the event list page）：含名稱（必填）、日期、場地欄位，及 Duo/Show 競賽類型 checkbox，送出後呼叫 `POST /api/v1/events`，成功後更新列表並顯示 toast
- [x] 2.3 實作刪除賽會按鈕（Admin can delete an event from the event list page）：點擊後顯示 SweetAlert2 確認對話框，確認後呼叫 `DELETE /api/v1/events/:id`，從列表移除並顯示 toast
- [x] 2.4 實作「進入賽會」按鈕（Admin navigates into an event from the event list）：點擊後導向 `/admin/events/:eventId`

## 3. 將 AdminSportSelectorComponent 改造為賽會儀表板

- [x] 3.1 改造 `AdminSportSelectorComponent`（將 AdminSportSelectorComponent 改造為賽會儀表板）：從 `ActivatedRoute` 讀取 `eventId`，呼叫 `GET /api/v1/events/:id` 取得賽會名稱，顯示於頁面標題
- [x] 3.2 更新四個運動項目卡片的導航連結，改為 `/admin/events/:eventId/kata`、`/admin/events/:eventId/matches/ne-waza`、`/admin/events/:eventId/matches/fighting`、`/admin/events/:eventId/matches/contact`（Admin sees sport selection page after login）

## 4. AdminComponent 移除建立賽會功能

- [x] 4.1 從 `admin.component.ts` 移除 `showCreateEvent` signal、`newEvent` 物件、`newEventCompetitionTypes` signal 及 `createEvent()` 方法（AdminComponent 移除建立賽會功能）
- [x] 4.2 從 `admin.component.html` 移除建立賽會表單 HTML 區塊，確認其餘隊伍管理、排名、匯出功能完整保留

## 5. MatchManagementComponent 移除賽會選擇 dropdown

- [x] 5.1 從 `match-management.component.ts` 移除賽會選擇相關 signal 與邏輯（MatchManagementComponent 移除賽會選擇 dropdown），改為於 `ngOnInit` 時從 `ActivatedRoute.snapshot.params['eventId']` 讀取 eventId 並直接載入場次資料
- [x] 5.2 從 `match-management.component.html` 移除賽會選擇 UI 區塊

## 6. 補強：移除演武管理頁的冗餘賽事管理欄

- [x] 6.1 從 `admin.component.html` 移除左欄「賽事管理」區塊（事件列表、編輯、刪除）；左右雙欄改為單欄隊伍管理
- [x] 6.2 從 `admin.component.ts` 移除 `events` signal、`filteredEvents` computed、`eventTypeFilter` signal、`eventsCountByType()`、`editingEventId` signal、`editEventForm`、`startEditEvent()`、`cancelEditEvent()`、`saveEditEvent()`、`deleteEvent()` 等賽事管理相關邏輯（保留 `selectedEvent` 供隊伍管理使用）

## 7. 補強：EventListComponent 新增編輯賽會功能

- [x] 7.1 在 `event-list.component.ts` 加入 inline 編輯邏輯：`editingEventId` signal、`editEventForm`（name/date/venue/status）、`startEditEvent()`、`cancelEditEvent()`、`saveEditEvent()` 方法（呼叫 `PATCH /api/v1/events/:id`）
- [x] 7.2 在 `event-list.component.html` 加入 inline 編輯 UI：點擊編輯按鈕展開 name/date/venue/status 欄位，確認後儲存

## 8. 驗收

- [x] 8.1 執行 `cd frontend && npm run build`，確認 Initial bundle 未超過 500kB 警告門檻（實際 464.71 kB）

## 9. 賽會運動項目選擇

> 建立或編輯賽會時，管理員可自由勾選納入的運動項目；若該項目已有資料則不可移除。

- [x] 9.1 後端：更新 `Event` model，加入 `includedSports: string[]` 欄位（可選值：`'kata-duo' | 'kata-show' | 'ne-waza' | 'fighting' | 'contact'`），預設空陣列（不強制）
- [x] 9.2 後端：更新 `POST /api/v1/events`，接受 `includedSports` 陣列並儲存
- [x] 9.3 後端：更新 `PATCH /api/v1/events/:id`，若嘗試移除某 sport 且該 sport 已有隊伍（kata）或場次（matches），回傳 400 錯誤
- [x] 9.4 前端：更新 `event-list.component`（建立表單）— 以卡片式多選 UI 取代原本的 Duo/Show checkbox，新增寢技、對打、格鬥卡片，至少勾選一項方可送出
- [x] 9.5 前端：更新 `event-list.component`（編輯表單）— inline 編輯中同樣顯示 sport 卡片多選，已有資料的項目顯示 disabled + 說明文字
- [x] 9.6 前端：更新 `admin-sport-selector.component` — 根據 `event.includedSports` 動態顯示對應運動項目卡片，未納入的項目不顯示

## 10. 裁判管理移出演武管理頁

> 裁判帳號管理（改密碼）與裁判指派賽事功能，移至獨立頁面，不再嵌在演武管理（admin.component）中。

- [x] 10.1 建立 `frontend/src/app/features/admin/judge-management/judge-management.component.ts`（Standalone + OnPush），包含完整裁判管理邏輯（`loadJudges()`、`assignJudgeEvent()`、`changePassword()`）
- [x] 10.2 建立 `judge-management.component.html`，呈現裁判列表（角色、指派賽事下拉選單、改密碼按鈕）
- [x] 10.3 在 `app.routes.ts` 新增路由 `/admin/judges`（套用 `roleGuard('admin')`），lazy-load `JudgeManagementComponent`
- [x] 10.4 在 `admin-sport-selector.component.html`（賽會儀表板）加入「裁判管理」入口連結，導向 `/admin/judges`
- [x] 10.5 從 `admin.component.ts` 移除 `judges` signal、`showJudges` signal、`loadJudges()`、`assignJudgeEvent()`、`changePassword()` 等裁判管理邏輯
- [x] 10.6 從 `admin.component.html` 移除裁判管理 UI 區塊（顯示/隱藏裁判列表的按鈕與 table）

## 11. 驗收

- [x] 11.1 執行 `cd frontend && npm run build`，確認無 build 錯誤且 Initial bundle 未超過 500kB（實際 464.80 kB）

## 12. 裁判入口頁（referee-event-landing）

> match_referee 登入後顯示被指派的賽會名稱，並根據賽會的 `includedSports` 動態顯示可進入的運動項目卡片。

- [x] 12.1 建立 `frontend/src/app/features/referee-landing/referee-landing.component.ts`（Standalone + OnPush）：從 `AuthService.user()` 取得 `eventId`，呼叫 `GET /api/v1/events/:eventId` 取得賽會資料（含 `includedSports`），以 Signal 儲存；若 `eventId` 為空則顯示「尚未指派賽事」提示
- [x] 12.2 建立 `referee-landing.component.html`：頂部顯示賽會名稱（大標）及「裁判作業台」副標；下方依 `includedSports` 動態顯示對應卡片——`ne-waza` → 寢技（導向 `/ne-waza-referee`）、`fighting` → 對打（導向 `/fighting-referee`）、`contact` → 格鬥（導向 `/match-referee`，即 contact referee）；未指派賽事時顯示提示卡片；向後相容：若 `includedSports` 為空則顯示全部三張卡片
- [x] 12.3 在 `app.routes.ts` 新增路由 `/referee`，lazy-load `RefereeLandingComponent`，套用 `roleGuard('match_referee', 'admin')`
- [x] 12.4 更新 `login.component.ts` 的 `navigateByRole()`：將 `match_referee` 對應路由由 `/match-referee` 改為 `/referee`
- [x] 12.5 更新 `login.component.ts` 的 `resolveTypeAndNavigate()`：`match_referee` 分支同樣改導向 `/referee`

## 13. 驗收

- [x] 13.1 執行 `cd frontend && npm run build`，確認無 build 錯誤
