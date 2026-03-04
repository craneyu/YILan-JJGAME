## Why

目前登入頁在顯示登入表單之前，先要求使用者選擇競賽項目（雙人演武／創意演武）。這個順序違反直覺：使用者應先驗明身分，系統才根據已登入的身分與所屬賽事，引導其選擇對應的競賽項目。現有流程也造成觀眾與未指派賽事的裁判在登入前無法確知可用項目，導致 UX 摩擦。

## What Changes

- 登入頁載入時**直接顯示登入表單**，移除登入前的競賽類型選擇步驟
- 使用者輸入帳號密碼成功登入後，若所屬賽事支援多競賽項目，**登入後才顯示競賽類型選擇**
- 若賽事只有一種競賽項目，系統自動選定，不顯示選擇畫面
- 選擇賽事（select-event）流程維持不變，但選完賽事後如需選擇競賽類型，在此步驟之後呈現

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `login-flow`: 流程順序改為「登入 → 選賽事（若需要）→ 選競賽項目（若多項目）」，移除登入前的類型選擇步驟
- `competition-type-selection`: 競賽類型選擇改為登入後觸發，而非登入前；單一類型時自動選定並跳過

## Impact

- Affected specs: `login-flow`, `competition-type-selection`
- Affected code:
  - `frontend/src/app/features/login/login.component.ts` — 重構登入步驟狀態機（LoginStep type、loadEvents、onLogin、confirmSelectEvent、navigateByRole）
  - `frontend/src/app/features/login/login.component.html` — 移除 select-type 為初始步驟，改為登入後步驟
  - `frontend/src/app/core/services/auth.service.ts` — setCompetitionType 呼叫時機調整（若有影響）
