## 1. 後端：新增 API

- [x] 1.1 在 `authController.ts` 新增 `updateRole()` controller：接受 `{ role }` body，驗證 role 值為合法 UserRole，更新並回傳更新後的使用者（排除 passwordHash）
- [x] 1.2 在 `authController.ts` 新增 `deleteUser()` controller：若 `req.user.id === params.userId` 回傳 400（不可自刪），否則刪除並回傳 success
- [x] 1.3 在 `auth.ts` routes 新增 `PATCH /users/:userId/role`（verifyToken + requireRole('admin')）和 `DELETE /users/:userId`（verifyToken + requireRole('admin')）

## 2. 前端：judge-management 擴充

- [x] 2.1 在 `judge-management.component.ts` 新增建立帳號邏輯：`showCreateForm` signal、`newUserForm`（username/password/role）、`createUser()` 方法（呼叫 `POST /auth/register`），成功後重新載入列表並顯示 toast
- [x] 2.2 在 `judge-management.component.ts` 新增 inline 角色編輯：`editingUserId` signal、`editingRole` 欄位、`startEditRole()`、`cancelEditRole()`、`saveEditRole()` 方法（呼叫 `PATCH /auth/users/:id/role`）
- [x] 2.3 在 `judge-management.component.ts` 新增 `deleteUser()` 方法：SweetAlert2 確認後呼叫 `DELETE /auth/users/:id`，成功後從列表移除
- [x] 2.4 在 `judge-management.component.ts` 新增 `ROLE_OPTIONS` 常數（5 個可選角色，排除 audience）及 `roleLabel()` helper（若不存在則補充）
- [x] 2.5 在 `judge-management.component.html` 新增建立帳號 UI：展開/收合表單，含 username input、password input、role 下拉選單、確認/取消按鈕
- [x] 2.6 在 `judge-management.component.html` 新增 inline 角色編輯 UI：非編輯狀態顯示角色 badge + 編輯圖示；編輯狀態顯示 role 下拉選單 + 儲存/取消按鈕
- [x] 2.7 在 `judge-management.component.html` 每列新增刪除按鈕（紅色垃圾桶圖示）

## 3. 驗收

- [x] 3.1 執行 `cd frontend && npm run build`，確認無 build 錯誤
