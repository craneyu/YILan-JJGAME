## Context

場次管理元件（`match-management.component.ts`）目前提供「清空全部」功能，透過 `DELETE /events/:eventId/matches?matchType=...` 刪除整個 Match 文件（包含選手資料）。單場重置則有 `POST /match-scores/reset` 可用。

現有 Match 文件同時儲存選手資訊（redPlayer/bluePlayer）和計分欄位（score、status、result 等），是一體的。`MatchScoreLog` 為獨立集合，記錄每個計分動作日誌。

三種 matchType（fighting、ne-waza、contact）共用同一元件，透過 `matchType()` Signal 區分當前運動類型，操作天然隔離。

## Goals / Non-Goals

**Goals:**

- 管理員可批次重置場次成績（分數歸零 + status → pending + result 清除）
- 操作限定於當前 matchType，不影響其他運動
- 支援三種操作模式：全選批次、篩選已完成批次、勾選個別場次
- admin 限定，與現有「清空全部」權限一致

**Non-Goals:**

- 不實作成績復原（undo）功能
- 不提供跨 matchType 的批次操作
- 不更動「清空全部」現有邏輯（刪除場次文件的行為不變）
- 不新增 Socket.IO 廣播（批次重置為管理後台操作，裁判端不需即時通知）

## Decisions

### 使用 matchIds 陣列的批次 API

**決定**：新增 `POST /api/v1/match-scores/reset-bulk`，body 為 `{ matchIds: string[] }`，前端傳入要重置的 ID 清單。

**替代方案考慮**：
- 方案 A：Filter-based API（`{ eventId, matchType, filterStatus? }`）→ 後端自己篩選
- 方案 B：matchIds 陣列 → 前端篩選後送

選擇方案 B，原因：
1. 後端邏輯更單純（不需重複篩選邏輯）
2. 前端已有 matches Signal，篩選在前端做更自然
3. 三種操作（全部 / 已完成 / 勾選）都收斂到同一個 API，不需多個端點
4. LAN 環境場次數量通常 < 100，陣列大小不是問題

### 完全重置（Complete Reset）

**決定**：重置動作包含：所有計分欄位歸零、MatchScoreLog 刪除、`status` → `pending`、`result` 清除（`undefined`）。

理由：清除成績的目的是讓場次可以重打，半重置狀態（分數 0 但顯示 completed）會造成裁判端混淆。

### UI：checkbox 多選 + 固定操作列

**決定**：
- 場次列表每列左側加 checkbox，標題列加「全選」checkbox
- 頁面上方（或清空全部按鈕旁）新增兩個按鈕：「清除全部成績」、「清除已完成成績」
- 有勾選時，出現「清除所選成績（N 筆）」按鈕

**替代方案**：右鍵選單 / Action dropdown → 不採用，因為場次列表較長時操作不直覺。

## Risks / Trade-offs

- **[Risk] 誤觸清除**：清除為不可逆操作 → Mitigation：使用 SweetAlert2 二次確認對話框，列出即將重置的場次數量
- **[Trade-off] 不廣播 Socket.IO**：裁判端若正在計分中，不會收到重置通知 → 接受，管理員應在比賽暫停時執行此操作；LAN 環境可口頭協調
- **[Risk] MatchScoreLog 與 Match 文件不一致**：若部分刪除失敗 → Mitigation：後端使用 `Promise.all` 同時執行，任一失敗回傳 500，前端顯示錯誤 toast
