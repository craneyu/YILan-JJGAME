## Why

目前裁判管理頁（`/admin/judges`）只能改密碼與指派賽事，無法新增帳號、刪除帳號或修改角色。管理員在賽前需要能完整維護人員帳密與角色，現有功能不足。

## What Changes

- 在裁判管理頁新增「新增帳號」表單：輸入帳號、密碼、角色（下拉選單）
- 每筆帳號列新增 inline 角色編輯：點擊後顯示角色下拉選單，可儲存或取消
- 每筆帳號列新增刪除按鈕（SweetAlert2 確認後刪除）
- 可選角色限定為需登入的 5 種：計分裁判、VR 裁判、賽序裁判、場次裁判、管理員（排除觀眾）

## Capabilities

### New Capabilities

- `user-account-management`: 管理員可在裁判管理頁完整維護使用者帳號，包含新增（帳號、密碼、角色）、inline 修改角色、刪除帳號

### Modified Capabilities

- `judge-management-page`: 在現有裁判管理頁擴充新增、編輯角色、刪除功能

## Impact

- Affected specs: `user-account-management`（新建）、`judge-management-page`（修改）
- Affected code:
  - `backend/src/routes/auth.ts` — 新增 `PATCH /auth/users/:id/role`、`DELETE /auth/users/:id`
  - `backend/src/controllers/authController.ts` — 新增 `updateRole()`、`deleteUser()` controller
  - `frontend/src/app/features/admin/judge-management/judge-management.component.ts` — 新增建立帳號、inline 編輯角色、刪除帳號邏輯
  - `frontend/src/app/features/admin/judge-management/judge-management.component.html` — 新增對應 UI
