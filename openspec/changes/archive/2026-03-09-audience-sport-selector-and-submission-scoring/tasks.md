## 1. 觀眾運動項目選擇器（Audience Sport Selector Entry Page）

- [x] 1.1 建立 `AudienceSportSelectorComponent`（Standalone + OnPush），路徑 `frontend/src/app/features/audience-sport-selector/`，實作觀眾選擇器自動偵測 Active Event：呼叫 `GET /api/v1/events?open=true` 並以 Signal 儲存第一筆 active event
- [x] 1.2 實作無 active event 時顯示「尚無進行中賽事」提示（Audience sport selector entry page — no active event scenario）
- [x] 1.3 實作 Sport selection navigation：顯示 5 個項目卡片（演武、創意演武、寢技、對打、格鬥），點擊後導航至對應 audience 路由並帶 `eventId` query param
- [x] 1.4 在 `app.routes.ts` 新增 `/audience-select` 路由，指向 `AudienceSportSelectorComponent`，無 roleGuard
- [x] 1.5 修改 `login.component.ts`，audience role 登入後導向 `/audience-select`（Login 頁導向修改、Audience role login redirect）
- [x] 1.6 修改 `match-audience.component.ts`，從 query params 讀取 `matchType`，預設值 `ne-waza`（Match audience matchType 動態化、Match audience dynamic matchType）

## 2. 寢技降伏計分規則修改（Submission Scoring Value）

- [x] 2.1 在 `match-referee.component.ts` 新增 `submissionPending = signal<'red' | 'blue' | null>(null)` Signal，追蹤待確認的降伏狀態（降伏 pending state 使用 Signal 追蹤）
- [x] 2.2 修改 `addSubmission(winner)` 方法：改呼叫 `applyScore(winner, 'score', 99)` 記錄 99 分（Submission scoring value），暫停計時器，設定 `submissionPending.set(winner)`，顯示 SweetAlert2 toast「降伏已登記，請確認勝負」，移除 `this.endMatch(winner, 'submission')` 呼叫（Winner confirmed after submission）
- [x] 2.3 修改 `endMatch` 方法：若 `submissionPending()` 非 null，method 改傳 `'submission'`，否則維持原傳入值；結束後清除 `submissionPending.set(null)`
- [x] 2.4 更新 `match-referee.component.html`：在降伏待確認狀態下，顯示 pending 提示徽章（Submission pending state persists until confirmed），並確保計分控制項保持可用
