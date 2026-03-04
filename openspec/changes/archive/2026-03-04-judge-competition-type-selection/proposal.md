## Why

目前賽序裁判（`/judge/sequence`）、計分裁判（`/judge/scoring`）及觀眾（`/audience`）頁面在登入後直接進入預設的 Duo（雙人演武）介面，無法在進入頁面後切換至 Show（創意演武）競賽項目。對於同時舉辦雙軌賽事的場合，使用者若需切換競賽類型，必須登出再登入重新選擇，操作流程不便。

## What Changes

- 賽序裁判、計分裁判、觀眾頁面新增「競賽項目切換」入口，允許在進入頁面後切換 Duo / Show
- 切換後導向對應競賽類型的頁面（`/judge/sequence` ↔ `/creative/sequence`，`/judge/scoring` ↔ `/creative/scoring`，`/audience` ↔ `/creative/audience`）
- 僅在使用者所屬賽事支援多競賽類型（`competitionTypes.length > 1`）時顯示切換入口；單一類型賽事不顯示
- 切換狀態持久化至 localStorage（`competitionType`），與登入時的選擇行為一致

## Capabilities

### New Capabilities

- `competition-type-switcher`: 裁判頁與觀眾頁的競賽類型切換元件，顯示當前競賽類型並提供切換按鈕；僅在多類型賽事中顯示

### Modified Capabilities

- `competition-type-selection`: 擴充競賽類型選擇場景，涵蓋登入後在各角色頁面切換的行為（原規格僅涵蓋登入流程中的選擇）

## Impact

- Affected specs: `competition-type-switcher`（新增）、`competition-type-selection`（修改：新增頁面內切換場景）
- Affected code:
  - `frontend/src/app/features/audience/audience.component.ts` / `.html`
  - `frontend/src/app/features/scoring-judge/scoring-judge.component.ts` / `.html`
  - `frontend/src/app/features/sequence-judge/sequence-judge.component.ts` / `.html`
  - `frontend/src/app/core/services/auth.service.ts`（讀取 eventId 對應的 competitionTypes）
  - `frontend/src/app/core/services/api.service.ts`（可能需取得當前賽事資訊）
