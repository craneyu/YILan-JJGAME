## Why

寢技 Excel 範本以 7 級分級（幼兒/國小低中高年級/青少年國中高中/公開）與「{N}勝」晉級佔位記錄賽程，但目前系統：

1. `MatchTier` 僅 4 級（`ELEM | JH | SH | OPEN`），無法表達「幼兒組」與國小低/中/高年級的細分，匯入時無對應碼可寫入。
2. 既有 Excel 匯入流程沒讀「分級」欄、`matchNo` 由前端 `i+1` 覆寫（覆蓋 Excel 場次序），且後端 `bulkCreateMatches` 已要求 tier 卻沒人帶 → 寢技 Excel 直接匯入會失敗。
3. 沒有任何「晉級依賴」資料結構：Excel 中 `3勝`（場次 3 勝者）佔位字串會直接寫入 `redPlayer.name`，前一場結束後不會 propagate 到後續場次，賽務人員必須手動把每筆勝者複製貼上。
4. 大量 bye 場次（藍方空白，表該分級量級僅一人）目前須照常進入比賽、開計時器才能完賽，浪費裁判操作步驟。

導致寢技賽程實際無法用 Excel 直接落地，限制錦標賽流暢度。

## What Changes

- **BREAKING**: `MatchTier` enum 從 `ELEM | JH | SH | OPEN` 改為 `KID | EL | EM | EH | JH | SH | OPEN`（移除 `ELEM`）。既有以 `ELEM` 儲存的寢技資料需於 apply 階段以 migration 腳本對應到 `EL/EM/EH` 或保留為 NULL（依現有資料量決定）。
- `NE_WAZA_DEFAULT_SECONDS` 擴充為：KID=90、EL/EM/EH=120、JH/SH=180、OPEN=300。
- Match schema 新增兩個可選欄位：
  - `redSource?: { fromMatchNo: number; resolved: boolean }`
  - `blueSource?: { fromMatchNo: number; resolved: boolean }`
- Match 匯入 Excel 解析器：
  - 認得「分級」欄位中文標籤（幼兒組 / 國小低年級組 / 國小中年級組 / 國小高年級組 / 青少年國中組 / 青少年高中組 / 公開組）→ 對應 tier code。
  - `matchNo = scheduledOrder = Number(row["場次序"])`（取代 `i+1`，未提供場次序視為錯誤）。
  - 紅／藍方姓名為 `{N}勝`（純數字 + 「勝」字，無 A 前綴）→ 寫入 `redSource`/`blueSource`，並將顯示用 player.name 設為 `"{N} 勝者"`、teamName 留空。
  - 解析時不接受 `A{N}勝` 舊格式（使用者已決定改用新格式，匯入失敗時錯誤訊息明示需改格式）。
  - 藍方空白：照常匯入，藍方留空字串，`isBye = true`，`status = "pending"`（不自動完賽）。
- Match 完賽 propagation：
  - `matchController.updateMatch` 在 `match.status` 變為 `completed` 且 `result.winner` 已設定時，觸發 propagation。
  - Propagation 對所有 `redSource.fromMatchNo === N || blueSource.fromMatchNo === N` 且 `resolved === false` 的場次，寫入勝方 name / teamName，並將該 source.resolved 設為 true。
- 新 Socket.IO 廣播事件：
  - `match:advancement-resolved`：payload `{ matchId, side: 'red' | 'blue', playerName, teamName, fromMatchNo }`，房間為 `eventId`。一場完賽可廣播多筆（一場可能被多個後續場次引用）。
- 裁判端 bye 場次操作：
  - `ne-waza-referee` 介面允許在 `status === "pending"`、`bluePlayer.name === ""`、`isBye === true` 的場次直接點「紅方勝」按鈕完賽（不需先按開始比賽、不需啟動計時器）。其餘場次照舊。
- 管理員端 match-management UI：
  - 匯入流程加入「分級」欄解析與「{N}勝」placeholder 偵測。
  - 場次列表顯示時，未 resolved 的 redSource / blueSource 顯示「N 勝者」灰字 placeholder；resolved 後顯示實際 name / teamName。
- 觀眾端顯示沿用既有 `ne-waza-audience` 介面，後端 propagation 完成後既有資料即正確。

## Non-Goals

- 不支援敗者組、雙敗淘汰、多階段交叉等比 1:1 直接引用更複雜的 bracket 結構。
- 不在這次擴充對打（`fighting`）與格鬥（`contact`）匯入，雖然這兩種比賽型態共用 Match schema，但中文分級對應與晉級佔位邏輯只實作於 ne-waza 匯入路徑。
- 不修改既有 ne-waza-scoring 計分邏輯、計時器、傷停、押制流程。
- 不向後相容 `A{N}勝` 舊格式（解析器只接受純數字 `{N}勝`，舊 Excel 需先手動改）。
- 不修改觀眾端 `ne-waza-audience` 顯示佈局與 socket 訂閱邏輯（既有畫面在 propagation 完成後資料即正確）。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `jujitsu-match-management`: 匯入規格擴增「分級」欄、`{N}勝` 晉級佔位語法；BREAKING：`matchNo` 改用 Excel「場次序」欄而非 `i+1`。
- `match-schedule-management`: 場次列表渲染未 resolved 來源時顯示「N 勝者」灰字 placeholder；BREAKING：`MatchTier` enum 從 `ELEM | JH | SH | OPEN` 改為 `KID | EL | EM | EH | JH | SH | OPEN`，預設秒數表同步擴充。
- `ne-waza-scoring`: bye 場次（`isBye === true` 且藍方空白）允許在 `status === "pending"` 直接由裁判點「紅方勝」完賽，不需啟動計時器。
- `match-audience-display`: 完賽 propagation 廣播 `match:advancement-resolved` 事件並寫入 Match 後續場次，觀眾端依現有 socket 訂閱機制收到更新後重繪場次列表。

## Impact

- Affected specs: `jujitsu-match-management`, `match-schedule-management`, `ne-waza-scoring`, `match-audience-display`
- Affected code:
  - Modified:
    - backend/src/models/Match.ts（tier enum 更新、redSource / blueSource schema、index 補充）
    - backend/src/utils/tournament.ts（NE_WAZA_DEFAULT_SECONDS 擴充至 KID/EL/EM/EH/JH/SH/OPEN）
    - backend/src/controllers/matchController.ts（bulkCreateMatches tier 驗證放寬、updateMatch propagation hook、新增 advancement-resolved 廣播）
    - backend/src/sockets/index.ts（broadcast.matchAdvancementResolved 函式註冊）
    - frontend/src/app/core/services/socket.service.ts（matchAdvancementResolved$ Observable 與型別介面）
    - frontend/src/app/core/models/match.model.ts（redSource / blueSource 型別與 MatchTier 擴充）
    - frontend/src/app/features/admin/match-management/match-management.component.ts（匯入解析器、列表 placeholder 渲染）
    - frontend/src/app/features/admin/match-management/match-management.component.html（placeholder 顯示）
    - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts（bye 場次直接判勝邏輯）
    - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html（bye 場次 UI）
  - New:
    - backend/src/utils/matchImport.ts（解析「分級」中文標籤、`{N}勝` placeholder、bye 偵測）
    - backend/src/utils/matchPropagation.ts（完賽後 propagate 勝者至下游場次）
  - Removed: (none)
- Data migration: 既有 `tier === "ELEM"` 的 Match documents 需以 seed 腳本檢視；錦標賽資料若已建立，由管理員依量級與選手年齡決定改為 `EL` / `EM` / `EH` 或保留 NULL。
- Bundle 影響：純資料結構與小量 UI 調整，預估 < 5kB；不引入新套件。
- Socket 房間影響：沿用 eventId 房間，新增一個事件名稱 `match:advancement-resolved`。
