## Summary

修正比賽列表的完賽 UX 三點：bye match 結束後缺少返回列表的動作、列表頁未將待開始場次排上方且缺色差、Admin 寢技賽程管理頁未顯示勝方且無即時推播。

## Motivation

裁判與管理員回報三個現場 UX 摩擦：

1. **Bye match 卡頁**：寢技裁判頁在 `completeByeMatch()`（`frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts`）成功後沒有切回 list view，必須手動返回，造成下一場 bye 場次得多一次點擊。
2. **完賽場次與待開始場次混雜**：裁判結束一場後回到列表，已完成場次仍佔據原位置，必須手動捲動找下一場 pending，視覺上也沒有區別狀態。
3. **Admin 寢技賽程管理看不到勝方**：`frontend/src/app/features/admin/match-management/match-management.component.html` 完成場次僅顯示綠色「完成」標籤，沒有紅方/藍方勝負與判決方式；且該頁未訂閱 `match:ended`，必須重新整理才看得到結果。

三項雖小，但都是裁判/管理員每場都會遇到的高頻摩擦，且都聚焦在「場次列表與完賽資訊呈現」，合併在同一 proposal 內以共享一套排序/色差/即時推播的實作慣例。

## Proposed Solution

### 1. Bye match 結束後返回列表

`completeByeMatch` 在成功 callback 的 `Swal.fire(...).then(...)` 內補 `this.view.set("list"); this.activeMatch.set(null);`，沿用 `endMatch` 既有寫法。

### 2. 列表排序與色差

`ne-waza-referee`、`fighting-referee`、`contact-referee` 三個裁判列表頁的排序鍵改為「先依 `status`（pending → in-progress → completed）、再依 `scheduledOrder`」。視覺上：

- pending 列：維持 `.glass-card` 與 `bg-white/10`，狀態徽章 `text-white/50`
- in-progress 列：保留現有黃色徽章
- completed 列：行底加 `bg-emerald-500/10` 並降低主要文字飽和度（`text-white/60`），狀態徽章維持綠色

排序變更只動 component 內的 computed/sort 邏輯，不動 backend rankings 端點。

### 3. Admin 寢技賽程管理顯示勝方 + 即時推播

`match-management.component.html` 在 `m.status === 'completed'` 區塊內，根據 `m.result.winner` 顯示「紅方勝」或「藍方勝」徽章（紅勝用 `bg-red-500/20 text-red-300`，藍勝用 `bg-blue-500/20 text-blue-300`），並顯示判決方式：

| `m.result.method` | 顯示文字 |
| --- | --- |
| `judge` | 裁判判決 |
| `submission` | 降伏勝 |
| `dq` | 取消資格 |

`match-management.component.ts` 訂閱 `socket.matchEnded$`，當事件抵達且 `matchId` 命中當前列表，更新該筆的 `status = 'completed'`、`result = { winner, method }`，並觸發排序重算。

## Non-Goals

- 不動 fighting-referee、contact-referee 的 bye match 流程（fighting 沒有 bye 概念；contact 後續處理由 proposal C 涵蓋）。
- 不修改 `match:ended` 事件 payload 介面，沿用既有 `{ matchId, winner, method }`。
- 不調整 audience 端的勝方顯示（已正常）。
- 不增加新的 `match:list-reordered` 事件，排序由 client 端 computed 即時處理。
- 不調整 backend 排名 API。

## Alternatives Considered

- **以 backend 排序回傳：** 拒絕，排序純屬 UI 偏好，不該污染 API。
- **bye match 共用 endMatch 路徑：** bye match 不該觸發 timer pause、不該寫 score reset，仍須保留獨立 `completeByeMatch`，僅補返回邏輯。
- **整列改用色票 token：** 範圍過大且未要求，採最小色差改動。

## Impact

- Affected specs: `match-list-grouping`、`match-schedule-management`、`jujitsu-match-management`
- Affected code:
  - Modified:
    - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
    - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
    - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
    - frontend/src/app/features/fighting-referee/fighting-referee.component.html
    - frontend/src/app/features/contact-referee/contact-referee.component.ts
    - frontend/src/app/features/contact-referee/contact-referee.component.html
    - frontend/src/app/features/admin/match-management/match-management.component.ts
    - frontend/src/app/features/admin/match-management/match-management.component.html
  - New: (none)
  - Removed: (none)

### Glassmorphism class 使用

完賽列複用既有 `.glass-card`，新增的 emerald 底色透過 utility `bg-emerald-500/10` 疊加；勝方徽章使用 utility `bg-red-500/20`、`bg-blue-500/20`，不新增共用元件 class。

### 角色與授權

- 不變更任何角色定義或授權邏輯。
- `match-management` 是 admin 唯一可達，沿用既有 `roleGuard('admin')`。
