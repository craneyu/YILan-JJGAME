## 1. 登入元件 TS 重構 - post-login competition type selection

- [x] 1.1 修改 `frontend/src/app/features/login/login.component.ts`：`loadEvents()` 改為 loadEvents silently populates audience dropdown（僅填充觀眾下拉選單），不再設定 `loginStep` 或 `availableTypes`；移除「Login page requires competition type selection before credential entry」舊行為；頁面初始狀態恆為 `loginStep = 'login'`（login form is the initial page state）
- [x] 1.2 修改 `onLogin()` 成功後邏輯：admin 直接導向，否則取得使用者 eventId 對應賽事的 `competitionTypes`，決定是否顯示 `select-type` 步驟（post-login competition type selection）
- [x] 1.3 修改 `confirmSelectEvent()` 完成後邏輯：確認加入賽事後，依該賽事 `competitionTypes` 決定後續步驟；若多類型則 `loginStep = 'select-type'`，若單類型則自動 `setCompetitionType()` 並導向（post-login competition type selection）
- [x] 1.4 實作 availableTypes determined from user's event：登入後從使用者 `eventId` 找出賽事，取其 `competitionTypes` 設入 `availableTypes` signal；實作 Login page presents competition type selection 的後登入觸發邏輯；單類型自動選定後 localStorage 存入 `'kata'` 或 `'creative'`（selected competition type persists after login，active event supports only Duo/Show）

## 2. 登入元件 HTML 調整 - login form is always visible on page load

- [x] 2.1 修改 `frontend/src/app/features/login/login.component.html`：`select-type` 步驟移至 `login` 步驟之後呈現（登入後，而非登入前），確保登入表單為頁面初始可見元素（login form is always visible on page load）
- [x] 2.2 移除登入表單上方的「← 重新選擇競賽項目」返回按鈕（因類型選擇已不在登入前），確認 `select-type` 步驟仍可從正確位置回到前一步驟

## 3. 路由驗收 - router directs users based on competition type

- [x] 3.1 確認 `navigateByRole()` 邏輯不受影響：`competitionType: 'kata'` 導向 `/judge/scoring`，`competitionType: 'creative'` 導向 `/creative/judge/scoring` 等，路由邏輯維持不變（router directs users based on competition type）

## 4. 驗收測試

- [x] 4.1 執行 `cd frontend && npm run build`，確認 Initial bundle 未超過 500kB
- [x] 4.2 手動測試：開啟登入頁，確認直接顯示帳密輸入表單，無競賽類型卡片（login form is the initial page state）
- [x] 4.3 手動測試：以裁判帳號登入雙軌賽事，確認登入後出現競賽類型選擇；選擇後正確導向角色頁面（type selection presented after login for multi-type events）
- [x] 4.4 手動測試：以裁判帳號登入單軌賽事，確認登入後直接導向角色頁面，無競賽類型選擇步驟（active event supports only Duo / active event supports only Show）
