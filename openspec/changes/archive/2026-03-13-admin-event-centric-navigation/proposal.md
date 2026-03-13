## Why

目前「建立賽會」功能嵌在演武管理頁 (`/admin/kata`)，導致賽會管理與演武項目管理混在同一層，語意不清；同時對打/寢技/格鬥的場次管理也需要各自選擇賽會，操作流程破碎。實際辦賽時，一個賽會包含所有運動項目（演武、對打、寢技、格鬥），應以賽會為頂層容器統一管理。

## What Changes

- 新增獨立的賽會列表頁 (`/admin/events`)，負責賽會的建立、刪除、列表顯示
- 新增賽會儀表板 (`/admin/events/:eventId`)，進入特定賽會後選擇運動項目
- 演武管理路由改為 `/admin/events/:eventId/kata`，移除其中的建立賽會功能
- 對打/寢技/格鬥管理路由改為 `/admin/events/:eventId/matches/:type`，移除各自的賽會選擇 dropdown
- `/admin` 根路由改為導向 `/admin/events`
- 後端無需變更（Event 已是所有資料的頂層容器）

## Capabilities

### New Capabilities

- `event-list-management`: 獨立的賽會管理頁面，提供賽會列表（名稱、日期、場地）、建立新賽會（含競賽類型選擇）、刪除賽會等功能，作為管理員進入平台後的第一個頁面
- `event-sport-selection`: 建立或編輯賽會時，管理員可自由勾選要納入的運動項目（演武-雙人、演武-創意、寢技、對打、格鬥）；若某運動項目已有賽事資料（隊伍或場次），則不允許取消勾選
- `judge-management-page`: 裁判帳號管理及指派賽事功能，獨立為專屬管理頁，不再混入演武管理頁

- `referee-event-landing`: 裁判（match_referee）登入後，先進入一個入口頁，顯示目前被指派的賽會名稱，並根據該賽會的 `includedSports` 動態呈現可用的運動項目卡片（寢技、對打、格鬥）；若未指派賽會則顯示提示訊息；點擊卡片後進入對應的裁判頁面

### Modified Capabilities

- `admin-sport-navigation`: 導航流程由「登入 → 運動項目選擇 → 管理頁」改為「登入 → 賽會列表 → 賽會儀表板 → 運動項目管理」；原運動項目選擇器改為在賽會 context 下呈現，且只顯示該賽會啟用的運動項目卡片

## Impact

- Affected specs: `event-list-management`（新建）、`admin-sport-navigation`（修改路由與流程）、`event-sport-selection`（新建）、`judge-management-page`（新建）
- Affected code:
  - `frontend/src/app/app.routes.ts` — 路由結構重組
  - `frontend/src/app/features/admin/admin-sport-selector/` — 改造為賽會儀表板，根據賽會 includedSports 動態顯示卡片
  - `frontend/src/app/features/admin/admin.component.ts/.html` — 移除建立賽會功能、移除裁判管理區塊
  - `frontend/src/app/features/admin/match-management/match-management.component.ts` — 移除賽會選擇 dropdown，改從路由取 eventId
  - `frontend/src/app/features/admin/event-list/` — 賽會列表元件，加入運動項目多選 UI
  - `backend/src/models/event.model.ts` — 擴充 `includedSports` 欄位
  - `backend/src/routes/events.ts` — 更新建立/編輯 API，加入保護邏輯（有資料不可移除）
  - 新增 `frontend/src/app/features/admin/judge-management/` — 裁判管理獨立元件
  - 新增 `frontend/src/app/features/referee-landing/` — 裁判入口頁（sport 選擇 + 賽會資訊顯示）
  - `frontend/src/app/features/login/login.component.ts` — 更新 match_referee 的登入後導向路由
  - `frontend/src/app/app.routes.ts` — 新增 `/referee` 路由
