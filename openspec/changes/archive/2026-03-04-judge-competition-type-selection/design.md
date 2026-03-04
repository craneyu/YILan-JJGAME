## Context

目前登入流程已實作「登入後選擇競賽類型」（`login-first-then-select-type` change），登入時確定 `competitionType` 並存入 localStorage（`jju_competition_type`），用以決定路由目標。

但登入後，各角色頁面（計分裁判 `/judge/scoring`、賽序裁判 `/judge/sequence`、觀眾 `/audience`）**無法在頁面內切換競賽類型**。對於雙軌（Duo + Show）賽事，裁判若需切換必須登出重新登入，觀眾則需回到首頁重新選擇賽事。

目前 AuthService 知道：
- `user().eventId`：使用者所屬賽事
- `competitionType()`：當前競賽類型（`'kata'` | `'creative'`）

但 AuthService **不知道**使用者所屬賽事支援哪些競賽類型（`competitionTypes: ('Duo' | 'Show')[]`），因此無法判斷是否應顯示切換入口。

觀眾頁（`/audience`）使用 queryParam `eventId` 且不需登入；其 summary API 回應目前不含 `event.competitionTypes`。

## Goals / Non-Goals

**Goals:**

- 計分裁判、賽序裁判頁面：在 header 新增競賽類型切換鈕，僅在多類型賽事中顯示
- 觀眾頁面：同樣新增競賽類型切換鈕（依 eventId 對應賽事的 competitionTypes 判斷）
- 切換後：更新 localStorage `jju_competition_type`，並導向對應競賽類型的同角色頁面
- AuthService：新增 `eventCompetitionTypes` Signal，從 localStorage 讀取並在登入時設定
- Summary API：在 `event` 物件中新增 `competitionTypes` 欄位，供觀眾頁判斷是否顯示切換入口

**Non-Goals:**

- 不修改 VR 裁判（`/judge/vr`）頁面（VR 只屬於 Duo，無 Show 對應）
- 不修改 Admin 頁面（已有獨立切換機制）
- 不修改登入流程（`login.component.ts` 不變）
- 不更改 JWT payload 結構或後端認證邏輯

## Decisions

### Decision 1: eventCompetitionTypes 存入 localStorage

**方案**：登入成功並確認 eventId 後，將 `event.competitionTypes` 以 JSON 字串存入 localStorage key `jju_event_competition_types`。AuthService 初始化時讀取並暴露為 `eventCompetitionTypes = signal<('Duo' | 'Show')[]>([])`。

**Rationale**：
- 裁判類元件不直接呼叫 `/events` API，藉此避免每次頁面載入重新 fetch
- 與現有 `jju_competition_type` 儲存模式一致
- AuthService `login()` 已接收 token + user payload，可在此一併設定

**儲存時機**：
- `login.component.ts` 的 `resolveTypeAndNavigate()` 與 `confirmSelectEvent()` 成功後設定（透過 AuthService 新方法 `setEventCompetitionTypes(types)`）

### Decision 2: 切換鈕設計（僅顯示於多類型賽事）

**方案**：在計分裁判與賽序裁判 header 區域新增一個小型 pill badge，顯示當前競賽類型名稱（「雙人演武」或「創意演武」），旁附切換圖示（`faArrowsRotate`）。

- 使用 `auth.eventCompetitionTypes()` 判斷：若 `length <= 1` 則不渲染此元素
- 點擊後呼叫元件內的 `switchCompetitionType()` 方法：
  1. 計算目標類型（kata ↔ creative）
  2. `auth.setCompetitionType(newType)`
  3. `router.navigate([routeMap[newType][role]])`

路由對映表：
```
kata:     scoring_judge → /judge/scoring
          sequence_judge → /judge/sequence
creative: scoring_judge → /creative/scoring
          sequence_judge → /creative/sequence
```

### Decision 3: 觀眾頁切換方案

**方案**：
1. Summary API（`GET /events/:id/summary`）回應的 `event` 物件新增 `competitionTypes: string[]` 欄位
2. `audience.component.ts` 從 `summaryData.event.competitionTypes` 判斷是否顯示切換鈕
3. 切換導向 `/creative/audience?eventId=<id>`（Show）或 `/audience?eventId=<id>`（Duo）

**Rationale**：觀眾不需登入，不使用 JWT，無法透過 AuthService 取得 competitionTypes。利用已有的 summary API 攜帶此資訊最小侵入。

### Decision 4: creative-audience 的反向切換

`/creative/audience` 已實作（來自 `add-creative-embu` change），同樣需新增切換鈕。邏輯與 Duo 觀眾頁對稱。

## Risks / Trade-offs

- **localStorage 時效性**：若管理員在使用者登入後修改賽事的 `competitionTypes`（新增或移除競賽類型），localStorage 的 `jju_event_competition_types` 不會即時更新。接受此限制（低頻操作，重新登入可修正）。
- **VR 裁判無切換**：VR 功能只存在於 Duo 系列，Show 沒有對應頁面。設計上直接跳過 VR 裁判，不顯示切換入口。
