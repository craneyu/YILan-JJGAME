# Proposal: admin-sport-selector

## Why

Admin 登入後直接進入一個龐大的管理頁面，缺乏依運動項目分類的導覽結構。目前演武賽程（Duo/Show）與格鬥技賽程（寢技/對打/格鬥）混雜，且格鬥技賽程匯入後無法瀏覽、編輯或刪除，管理員無法有效管理各項目賽程資料。

## What Changes

- **新增** Admin 運動項目選擇頁（`/admin`）：登入後先顯示 4 張大卡片（演武、寢技、對打、格鬥），再依選擇導向對應管理頁
- **搬移** 現有 Admin 功能至 `/admin/kata`（演武管理頁，功能不變）
- **新增** 格鬥技賽程管理頁（`/admin/matches/:matchType`）：支援寢技、對打、格鬥三種項目，含列表瀏覽、編輯、單筆刪除、清空全部
- **新增** 後端 `DELETE /api/v1/events/:eventId/matches/:matchId`（單筆刪除）
- **新增** 後端 `DELETE /api/v1/events/:eventId/matches`（清空全部，支援 `?matchType=` 過濾）
- **修改** `app.routes.ts`：更新路由結構（`/admin` → 項目選擇，`/admin/kata` → 演武管理，`/admin/matches/:matchType` → 格鬥技管理）
- **修改** `navigateByRole()`：`admin` 角色導向 `/admin`（項目選擇頁）

## Capabilities

### New Capabilities

- `admin-sport-navigation`: Admin 登入後的運動項目選擇入口，4 張大卡片分別對應演武（Duo+Show）、寢技、對打、格鬥，點選後導向對應管理頁
- `match-schedule-management`: 格鬥技賽程管理頁（`/admin/matches/:matchType`），支援選擇賽事、查看場次列表（依量級分組折疊）、編輯單筆場次（選手姓名/隊名/場次序）、刪除單筆、清空全部該項目場次

### Modified Capabilities

(none)

## Impact

- Affected specs: `admin-sport-navigation`, `match-schedule-management`
- Affected code:
  - `backend/src/controllers/matchController.ts` — 新增 `deleteMatch`、`clearMatches` controller
  - `backend/src/routes/matches.ts` — 新增 DELETE 單筆與批量路由
  - `frontend/src/app/app.routes.ts` — 路由重組（/admin → 選擇頁，/admin/kata → 演武，/admin/matches/:matchType → 格鬥技）
  - `frontend/src/app/features/admin/admin.component.ts` — 搬移至 `/admin/kata` 路由，保持功能不變
  - `frontend/src/app/features/admin/admin-sport-selector/` — 新增運動項目選擇頁元件
  - `frontend/src/app/features/admin/match-management/` — 新增格鬥技賽程管理頁元件
  - `frontend/src/app/features/login/login.component.ts` — `navigateByRole()` admin 導向 `/admin`（已是現有行為，確認無需變更）
