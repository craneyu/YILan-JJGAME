# Design: admin-sport-selector

## Context

現有 Admin 功能（演武賽事管理、隊伍匯入、排名匯出）全部集中在單一元件 `AdminComponent`，路由為 `/admin`。格鬥技賽程（寢技/對打/格鬥）的匯入 UI 附加在同一頁底部，但缺少瀏覽、編輯、刪除功能。Admin 登入後直接進入此頁，沒有任何項目分類的選擇介面。

## Goals / Non-Goals

**Goals:**

- Admin 登入後先看到 4 張運動項目卡片，點選後進入對應管理頁
- 演武管理保持現有功能不變，僅路由從 `/admin` 搬至 `/admin/kata`
- 格鬥技三個項目（寢技/對打/格鬥）共用同一個管理元件，由路由參數 `matchType` 區分
- 格鬥技管理頁支援：選賽事、瀏覽場次列表（依量級分組）、編輯單筆、刪除單筆、清空全部

**Non-Goals:**

- 不新增格鬥技籤表排程功能（僅管理場次資料）
- 不修改演武 Admin 的任何現有功能
- 不支援格鬥技場次手動新增（僅匯入 + 管理已匯入資料）

## Decisions

### 路由結構：共用元件 + `matchType` 路由參數

格鬥技三個項目（ne-waza、fighting、contact）共用同一個 `MatchManagementComponent`，透過 `ActivatedRoute.params.matchType` 取得目前項目，動態載入對應場次資料。

**優點**：三個項目邏輯完全相同，避免複製三份元件；新增項目只需加路由。
**替代方案**：三個獨立元件 → 重複程式碼過多，維護成本高，捨棄。

路由定義：
```
/admin                         → AdminSportSelectorComponent（新）
/admin/kata                    → AdminComponent（搬移，功能不變）
/admin/matches/ne-waza         → MatchManagementComponent（matchType=ne-waza）
/admin/matches/fighting        → MatchManagementComponent（matchType=fighting）
/admin/matches/contact         → MatchManagementComponent（matchType=contact）
```
所有 `/admin/*` 路由皆套用 `roleGuard('admin')`。

### 後端 DELETE：新增兩個 endpoint

現有 `matchController.ts` 沒有刪除邏輯，需新增：

- `DELETE /api/v1/events/:eventId/matches/:matchId`：刪除單筆，限 admin
- `DELETE /api/v1/events/:eventId/matches`：清空全部，支援 `?matchType=` query 過濾（無此參數則清空該賽事所有場次），限 admin

**安全考量**：清空全部需 SweetAlert2 二步確認，backend 不做額外保護（LAN 環境，admin 角色已足夠）。

### 場次列表 UI：依量級分組，行內編輯

場次列表按 `weightClass` 分組顯示，展開後列出各場次。編輯採行內（inline）方式——點擊「編輯」後該行轉為 input 欄位，按「儲存」送 PATCH，不跳出 modal。

可編輯欄位：紅方姓名、紅方隊名、藍方姓名、藍方隊名、場次序。
鎖定條件：`status === 'completed'` 的場次顯示禁用樣式，不可編輯/刪除。

## Risks / Trade-offs

- [風險] 演武 Admin 路由從 `/admin` 改為 `/admin/kata`，若裁判端 `navigateByRole()` 的 admin 導向沒有正確更新，admin 登入後會直接進入演武管理而非選擇頁。→ **緩解**：`navigateByRole()` 中 admin 的目標已是 `/admin`（現有行為），確認保持不變即可。

- [風險] `/admin` roleGuard 改為選擇頁後，Angular 路由的子路由保護需確認每條子路由都有 `roleGuard('admin')`。→ **緩解**：在 tasks 中明確列出每條路由需加守衛。
