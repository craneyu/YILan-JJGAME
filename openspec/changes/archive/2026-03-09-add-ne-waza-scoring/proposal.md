# Proposal: add-ne-waza-scoring

## Why

柔術競賽（寢技、對打、格鬥）需要一套獨立於演武計分的單淘汰賽制計分系統，支援賽序裁判即時操作計時、得分、警告、傷停與判決，並透過 Socket.IO 即時同步至公開計分板。

## What Changes

- **新增** `match_referee` 使用者角色（JWT role），負責管理場次計時與計分
- **新增** 後端 `Match` 資料模型（場次：項目/組別/量級/紅藍方/狀態/結果）
- **新增** 後端 `MatchScore` 資料模型（每筆得分：方/分值/類型/時間戳）
- **新增** 後端 API routes：`/api/v1/matches`（CRUD）、`/api/v1/match-scores`（記錄）
- **新增** Socket.IO 事件：`match:score-updated`、`match:warning-updated`、`match:ended`
- **新增** 前端 `match-referee` 元件：場次選取列表 + 寢技計分介面（計時、紅藍雙方得分/警告/優勢/降伏勝/傷停/DQ/判決）
- **新增** 前端 `match-audience` 元件：公開即時計分板（紅藍得分、優勢、警告、計時器）
- **新增** Admin 匯入賽程功能：支援 CSV/Excel 批次建立場次（項目、組別、量級、選手）
- **修改** 前端路由：新增 `/match-referee`（roleGuard: match_referee）、`/match-audience`（公開）
- **修改** 登入頁：新增 `match_referee` 角色選項

## Capabilities

### New Capabilities

- `jujitsu-match-management`: Admin 建立與匯入柔術賽程（場次清單、紅藍方選手），管理場次狀態（待開始/進行中/已完成），已完成場次鎖定不可重進
- `ne-waza-scoring`: match_referee 從場次列表選取寢技場次，進行完整計分操作（計時啟動/暫停、2/3/4分得分、優勢、降伏勝、警告累計規則、取消上一筆、傷停、DQ、裁判判決），結果自動推進單淘汰籤表
- `match-audience-display`: 公開即時計分板，透過 Socket.IO 接收 `match:score-updated` / `match:ended` 即時顯示紅藍雙方得分、優勢數、警告數、計時器倒數

### Modified Capabilities

(none)

## Impact

- Affected specs: `jujitsu-match-management`, `ne-waza-scoring`, `match-audience-display`
- Affected code:
  - `backend/src/models/` — 新增 `Match.ts`、`MatchScore.ts`
  - `backend/src/controllers/` — 新增 `matchController.ts`、`matchScoreController.ts`
  - `backend/src/routes/` — 新增 `matches.ts`、`matchScores.ts`
  - `backend/src/sockets/index.ts` — 新增 match 事件 handlers
  - `backend/src/seeds/initialUsers.ts` — 新增 `match_referee` 種子帳號
  - `frontend/src/app/features/` — 新增 `match-referee/`、`match-audience/`
  - `frontend/src/app/app.routes.ts` — 新增兩條路由
  - `frontend/src/app/features/login/` — 新增角色選項
  - `frontend/src/app/core/services/socket.service.ts` — 新增 match 事件型別
