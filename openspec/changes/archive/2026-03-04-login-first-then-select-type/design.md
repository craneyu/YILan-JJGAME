## Context

目前登入頁在顯示帳密輸入表單前，先執行 `loadEvents()` 取得當前賽事的 `competitionTypes`，並以此決定初始步驟：多類型時呈現 `select-type` 卡片選擇畫面，單類型時自動預選並直接顯示登入表單。

現有狀態機（LoginStep）執行順序：
1. `loadEvents()` → 讀取 `availableTypes`
2. 若多類型 → `loginStep = 'select-type'`（顯示 Duo/Show 卡片）
3. 點選卡片後 → `loginStep = 'login'`
4. 登入成功 → 導向或 `loginStep = 'select-event'`

問題：競賽類型選擇在身分驗證前無實質意義——類型資訊僅在「已知使用者所屬賽事」後才有導向依據。

## Goals / Non-Goals

**Goals:**

- 登入頁初始狀態恆為 `'login'`（帳密輸入表單），移除登入前的類型選擇步驟
- 登入成功（或確認選擇賽事）後，依使用者所屬賽事的 `competitionTypes` 決定是否呈現 `select-type` 步驟
- 單類型賽事仍自動選定，不顯示選擇 UI
- 保留 localStorage 儲存格式（`'kata'` / `'creative'`）與角色路由邏輯不變

**Non-Goals:**

- 更改後端認證 API 或 JWT payload 結構
- 更改 `competitionType` localStorage 鍵名或值格式
- 更改各角色的導向目標路由

## Decisions

### Post-login competition type selection

登入成功或 `confirmSelectEvent()` 完成後，系統 SHALL 從使用者所屬賽事取得 `competitionTypes`，並決定後續步驟：

- `competitionTypes.length > 1` → `loginStep = 'select-type'`（顯示類型選擇卡片）
- `competitionTypes.length === 1` → 自動 `setCompetitionType()`，直接 `navigateByRole()`

**Rationale**：帳密憑證與競賽類型無關，只有確認使用者身分及所屬賽事後，才能知道哪些競賽類型適用。

### loadEvents silently populates audience dropdown

`loadEvents()` 仍在頁面載入時執行，目的是填充觀眾入口的賽事下拉選單（`allOpenEvents`）。但 SHALL NOT 再依 `competitionTypes` 更改 `loginStep`，也不再設定 `availableTypes`。

**Rationale**：觀眾入口（無需登入）仍需列出開放賽事，此行為不變；類型感知改為登入後觸發。

### availableTypes determined from user's event

登入成功後，從 `events` Signal 中查找使用者 `eventId` 對應的賽事，取其 `competitionTypes` 賦值給 `availableTypes`。
- 若使用者無 `eventId`（需選賽事）→ `confirmSelectEvent()` 完成後再查找
- Admin 不需選競賽類型，直接導向 `/admin`

## Risks / Trade-offs

- [步驟數不變]: 雙軌賽事的裁判仍需經歷三個步驟（原：select-type → login → select-event；新：login → select-event → select-type）。使用者習慣須稍作調整。
- [觀眾路由]: `loginAsAudience()` 仍依所選賽事的 `competitionTypes` 決定導向，此邏輯不受本次變更影響。
