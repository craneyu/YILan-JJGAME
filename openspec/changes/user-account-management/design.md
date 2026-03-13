## Context

現有 `judge-management.component` 提供裁判列表、指派賽事、改密碼。後端 `POST /auth/register`（admin 限定）已可建立帳號，但前端未提供對應 UI。缺少刪除與角色修改的後端路由與前端介面。

## Goals / Non-Goals

**Goals:**

- 新增帳號：帳號名稱、密碼、角色（5 選 1），呼叫現有 `POST /auth/register`
- Inline 角色編輯：點擊角色 badge → 出現下拉選單 → 儲存呼叫新增的 `PATCH /auth/users/:id/role`
- 刪除帳號：確認後呼叫新增的 `DELETE /auth/users/:id`
- 可選角色：`scoring_judge`、`vr_judge`、`sequence_judge`、`match_referee`、`admin`（排除 `audience`）

**Non-Goals:**

- 修改帳號名稱（username 不可改，需刪除重建）
- 帳號匯入（CSV 批次建立）
- 帳號停用（無 active/inactive 狀態）

## Decisions

**後端新增兩支 API：**
- `PATCH /auth/users/:id/role` — 更新角色，body: `{ role }` ，admin 限定
- `DELETE /auth/users/:id` — 刪除帳號，admin 限定；不可刪除自己的帳號（防止管理員自鎖）

**Inline 編輯流程：**
- 預設顯示角色 badge（只讀）
- 點擊編輯鉛筆圖示 → 該列展開角色下拉 + 儲存/取消按鈕
- 同一時間只允許一列處於編輯狀態（`editingUserId` signal）

**新增帳號表單：**
- 置於列表頂部，可展開/收合（`showCreateForm` signal）
- 欄位：username、password、role 下拉

## Risks / Trade-offs

- 刪除帳號為不可逆操作，需 SweetAlert2 確認對話框
- 自我刪除防護：後端比對 `req.user.id === params.userId`，若相同回傳 400
