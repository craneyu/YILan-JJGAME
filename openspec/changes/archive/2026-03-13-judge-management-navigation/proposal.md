## Why

目前「裁判管理」按鈕位於賽會內頁（`admin-sport-selector`），管理員必須先進入某個賽會才能看到此入口。然而裁判帳號管理（新增帳號、指派角色、改密碼、刪除）是全域性的管理操作，與特定賽會無關，應直接從賽會列表頁可達，以減少操作層次。

## What Changes

- 將「裁判管理」按鈕從 `admin-sport-selector` 頁面的右上角**移除**
- 在 `event-list` 頁面的操作按鈕區（「建立賽會」旁）**新增**「裁判管理」按鈕，點擊後導向 `/admin/judges`
- `judge-management` 頁面的「返回」按鈕目前導向 `/admin/events`（行為不變，但現在從 event-list 層進入更合語義）

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `event-list-management`: 賽會列表頁新增「裁判管理」入口按鈕
- `admin-sport-navigation`: 賽會內頁移除「裁判管理」按鈕

## Impact

- Affected specs: `event-list-management`、`admin-sport-navigation`
- Affected code:
  - `frontend/src/app/features/admin/event-list/event-list.component.html` — 新增裁判管理按鈕
  - `frontend/src/app/features/admin/event-list/event-list.component.ts` — 新增 navigate 方法與相關 icon import
  - `frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html` — 移除裁判管理按鈕
  - `frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts` — 移除相關 icon（若只在此使用）
