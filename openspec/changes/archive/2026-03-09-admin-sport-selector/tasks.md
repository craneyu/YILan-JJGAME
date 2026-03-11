# Tasks: admin-sport-selector

## 1. 後端：新增 DELETE endpoints（後端 DELETE：新增兩個 endpoint）

- [x] 1.1 在 `backend/src/controllers/matchController.ts` 新增 `deleteMatch` controller：`DELETE /api/v1/events/:eventId/matches/:matchId`，找不到場次時回傳 404（Backend exposes DELETE endpoints for matches — 單筆刪除）
- [x] 1.2 在 `backend/src/controllers/matchController.ts` 新增 `clearMatches` controller：`DELETE /api/v1/events/:eventId/matches`，支援 `?matchType=` 過濾，回傳 `{ success: true, deleted: count }`（Backend exposes DELETE endpoints for matches — 批量清空）
- [x] 1.3 在 `backend/src/routes/matches.ts` 新增兩條 DELETE 路由，均套用 `requireRole('admin')`（All admin routes require admin role）
- [x] 1.4 驗證：curl 測試單筆刪除與批量清空回傳正確，非 admin 角色回傳 403

## 2. 前端路由重組（路由結構：共用元件 + `matchType` 路由參數）

- [x] 2.1 更新 `frontend/src/app/app.routes.ts`：`/admin` 改為載入新的 `AdminSportSelectorComponent`，套用 `roleGuard('admin')`（Admin sees sport selection page after login）
- [x] 2.2 新增 `/admin/kata` 路由，載入現有 `AdminComponent`，套用 `roleGuard('admin')`（All admin routes require admin role）
- [x] 2.3 新增 `/admin/matches/:matchType` 路由，載入新的 `MatchManagementComponent`，套用 `roleGuard('admin')`（Match management page loads matches by sport type）
- [x] 2.4 確認 `login.component.ts` 的 `navigateByRole()` 中 `admin` 仍導向 `/admin`（無需修改，確認現有行為）

## 3. 前端：新增 AdminSportSelectorComponent（admin-sport-navigation）

- [x] 3.1 建立 `frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts`：Standalone、OnPush，inject Router，顯示 4 張運動項目卡片（Admin sees sport selection page after login）
- [x] 3.2 實作 4 張卡片的 HTML 模板，使用 `.glass-card` 樣式，點擊演武導向 `/admin/kata`，點擊寢技/對打/格鬥分別導向 `/admin/matches/ne-waza`、`/admin/matches/fighting`、`/admin/matches/contact`（Admin selects 演武 sport / Admin selects a combat sport）
- [x] 3.3 驗證：admin 登入後看到選擇頁，4 張卡片點選後正確導向（Admin sees sport selection page after login）

## 4. 前端：新增 MatchManagementComponent（match-schedule-management）

- [x] 4.1 建立 `frontend/src/app/features/admin/match-management/match-management.component.ts`：Standalone、OnPush，inject ApiService、ActivatedRoute、Router，Signal：`matchType`（從路由參數）、`events`、`selectedEventId`、`matches`、`groupedMatches`（Match management page loads matches by sport type）
- [x] 4.2 實作賽事選擇下拉，選擇後呼叫 `GET /api/v1/events/:eventId/matches?matchType=<current>`，設定 `matches` Signal（No event selected）
- [x] 4.3 實作 `groupedMatches` computed Signal：依 `weightClass` 分組，組內依 `scheduledOrder` 排序（場次列表 UI：依量級分組，行內編輯）
- [x] 4.4 實作場次列表 HTML 模板：依量級分組折疊顯示，每筆顯示場次序、紅方/藍方選手、狀態 badge（Match list is grouped by weight class）
- [x] 4.5 實作行內編輯（inline edit）：Admin can edit a pending match inline，點擊「編輯」切換 input 欄位，可修改紅藍方姓名/隊名/場次序，按「儲存」送 `PATCH /api/v1/events/:eventId/matches/:matchId`（場次列表 UI：依量級分組，行內編輯）
- [x] 4.6 實作 completed 場次鎖定：`status === 'completed'` 時編輯/刪除按鈕禁用，顯示鎖定圖示（Completed match is locked）
- [x] 4.7 實作單筆刪除：點擊「刪除」→ SweetAlert2 確認 → `DELETE /api/v1/events/:eventId/matches/:matchId` → 更新列表（Admin can delete a single match with confirmation）
- [x] 4.8 實作清空全部：點擊「清空全部」→ SweetAlert2 確認 → `DELETE /api/v1/events/:eventId/matches?matchType=<current>` → 清空列表（Admin can clear all matches for a sport type）
- [x] 4.9 在頁面頂部新增「← 返回」按鈕導向 `/admin`，顯示目前運動項目名稱與賽事名稱
- [x] 4.10 將 Admin 匯入賽程功能（importMatchFile、downloadMatchTemplate）從 `AdminComponent` 移入此元件，保持 XLSX 匯入邏輯不變
- [x] 4.11 驗證：選擇賽事後可見場次列表，編輯/刪除/清空均正常運作

## 5. 驗收確認

- [x] 5.1 演武管理（`/admin/kata`）功能完整且與重組前一致
- [x] 5.2 `cd frontend && npm run build` 通過，Initial bundle 未超過 500kB 警告門檻
