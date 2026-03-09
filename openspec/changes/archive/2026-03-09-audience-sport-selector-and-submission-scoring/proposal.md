## Why

目前觀眾進入系統後直接進入演武或柔術場次畫面，沒有統一入口，且寢技「降伏」按鈕會直接以 1 分記錄並立即結束場次，不符合實際裁判確認流程。需要新增觀眾運動項目選擇頁，並修正降伏計分規則。

## What Changes

- 新增 `/audience-select` 路由與 `AudienceSportSelectorComponent`，自動偵測進行中賽事並顯示 5 個運動項目入口
- Login 頁 audience role 登入後改導向 `/audience-select`
- `match-audience` 組件的 `matchType` 從 query params 讀取（取代硬編碼 `ne-waza`）
- 裁判介面「降伏」分數由 1 改為 99，移除自動結束場次邏輯，改由裁判手動確認勝負後才結束

## Capabilities

### New Capabilities

- `audience-sport-selector`: 觀眾運動項目選擇畫面，自動偵測 active event，提供演武、創意演武、寢技、對打、格鬥五個入口

### Modified Capabilities

- `match-scoring`: 寢技降伏計分規則變更——降伏分數改為 99 分，且不再自動結束場次，需裁判人工確認勝負

## Impact

- 無新增套件，無 bundle 影響
- 無 API 變更（降伏仍使用既有 POST /match-scores 端點，type 不變）
- 無 Socket.IO 事件異動
- 無 Mongoose Schema 異動
- 影響角色：audience（新選擇頁）、match_referee（降伏計分邏輯）

影響檔案：
- `frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.ts`（新增）
- `frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.html`（新增）
- `frontend/src/app/app.routes.ts`（新增 `/audience-select` 路由）
- `frontend/src/app/features/login/login.component.ts`（audience role 導向修改）
- `frontend/src/app/features/match-audience/match-audience.component.ts`（matchType 動態化）
- `frontend/src/app/features/match-referee/match-referee.component.ts`（降伏邏輯修改）
- `frontend/src/app/features/match-referee/match-referee.component.html`（UI 狀態更新）
