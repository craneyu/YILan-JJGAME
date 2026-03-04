## 1. AuthService 擴充 - event competition types persisted in localStorage

- [x] 1.1 修改 `frontend/src/app/core/services/auth.service.ts`：新增 `eventCompetitionTypes = signal<('Duo' | 'Show')[]>([])` Signal；`login()` 方法新增可選參數 `eventCompetitionTypes?: ('Duo' | 'Show')[]`，若有傳入則序列化為 JSON 存入 localStorage key `jju_event_competition_types`；初始化時從 localStorage 讀取並設入 Signal；`logout()` 時清除 `jju_event_competition_types` 並 Signal reset 為 `[]`（event competition types persisted in localStorage）

- [x] 1.2 修改 `frontend/src/app/features/login/login.component.ts`：在 `resolveTypeAndNavigate()` 與 `confirmSelectEvent()` 成功後，呼叫 `auth.login()` 時傳入 `eventCompetitionTypes`（從 `events()` Signal 中查找對應賽事的 `competitionTypes`）；確保 AuthService 在登入後 Signal 已正確設定

## 2. 後端 Summary API 擴充 - summary returns competition types

- [x] 2.1 修改 `backend/src/controllers/eventController.ts` 的 `getSummary`（或對應的 summary handler）：在回應的 `event` 物件中新增 `competitionTypes` 欄位，值取自 Event 文件的 `competitionTypes` 陣列（Summary API includes event competition types）

## 3. 計分裁判頁競賽類型切換 - competition type switcher for scoring judge

- [x] 3.1 修改 `frontend/src/app/features/scoring-judge/scoring-judge.component.ts`：注入 `AuthService` 與 `Router`；新增 `hasMultipleTypes = computed(() => this.auth.eventCompetitionTypes().length > 1)`；實作 `switchCompetitionType()` 方法：計算目標類型（kata ↔ creative），呼叫 `auth.setCompetitionType(newType)`，導向對應路由（kata → `/judge/scoring`，creative → `/creative/scoring`）；import `faArrowsRotate`（switcher triggers navigation on click）

- [x] 3.2 修改 `frontend/src/app/features/scoring-judge/scoring-judge.component.html`：在 header 區域新增競賽類型切換 pill（`@if (hasMultipleTypes())`），顯示當前類型名稱（「雙人演武」或「創意演武」）與切換圖示（`faArrowsRotate`），使用 `.glass-btn` 樣式，點擊呼叫 `switchCompetitionType()`；單類型賽事不顯示任何切換元素（switcher visible for multi-type event / switcher hidden for single-type event）

## 4. 賽序裁判頁競賽類型切換 - competition type switcher for sequence judge

- [x] 4.1 修改 `frontend/src/app/features/sequence-judge/sequence-judge.component.ts`：同 3.1 邏輯，但路由對映為 kata → `/judge/sequence`，creative → `/creative/sequence`（sequence judge switches competition type）

- [x] 4.2 修改 `frontend/src/app/features/sequence-judge/sequence-judge.component.html`：同 3.2 樣式與顯示邏輯，新增切換 pill 於 header 區域

## 5. 觀眾頁競賽類型切換 - competition type switcher for audience

- [x] 5.1 修改 `frontend/src/app/features/audience/audience.component.ts`：從 summary 回應的 `event.competitionTypes` 取得賽事支援類型；新增 `hasMultipleTypes = computed(() => (this.summaryData()?.event?.competitionTypes?.length ?? 0) > 1)`；實作 `switchToCreative()` 方法：導向 `/creative/audience?eventId=<id>`（audience switcher navigates between audience pages）

- [x] 5.2 修改 `frontend/src/app/features/audience/audience.component.html`：在 header 新增競賽類型切換 pill（`@if (hasMultipleTypes())`），使用 `.glass-btn` 樣式，點擊呼叫 `switchToCreative()`；僅在 `hasMultipleTypes()` 為 true 時顯示

## 6. Show 觀眾頁反向切換 - reverse switch from creative audience

- [x] 6.1 修改 `frontend/src/app/features/creative-audience/creative-audience.component.ts`：從 creative summary API 或直接呼叫 `/events/:id` 取得 `competitionTypes`；新增 `hasMultipleTypes` computed Signal；實作 `switchToDuo()` 方法：導向 `/audience?eventId=<id>`（reverse switch from creative back to kata）

- [x] 6.2 修改 `frontend/src/app/features/creative-audience/creative-audience.component.html`：同 5.2 樣式，新增切換 pill 並指向 `switchToDuo()`

## 7. Show 計分裁判與賽序裁判反向切換

- [x] 7.1 修改 `frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.ts`：注入 `AuthService` 與 `Router`；新增 `hasMultipleTypes` computed；實作 `switchCompetitionType()` 方法：creative → `/creative/scoring`，kata → `/judge/scoring`（reverse switch from creative back to kata）

- [x] 7.2 修改 `frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.html`：新增競賽類型切換 pill 於 header

- [x] 7.3 修改 `frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts`：同 7.1，路由對映為 kata → `/judge/sequence`，creative → `/creative/sequence`

- [x] 7.4 修改 `frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html`：同 7.2

## 8. 驗收測試

- [x] 8.1 執行 `cd frontend && npm run build`，確認 Initial bundle 未超過 500kB
- [x] 8.2 手動測試：以裁判帳號登入雙軌賽事，確認計分裁判頁與賽序裁判頁 header 顯示競賽類型切換鈕，點擊後正確切換頁面與 localStorage
- [x] 8.3 手動測試：以裁判帳號登入單軌賽事，確認計分裁判頁與賽序裁判頁 header **不顯示**競賽類型切換鈕
- [x] 8.4 手動測試：觀眾進入雙軌賽事，確認觀眾頁 header 顯示切換鈕，點擊後切換至 `/creative/audience?eventId=<id>`
