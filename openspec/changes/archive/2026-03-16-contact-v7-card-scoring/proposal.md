## Why

系統已支援 `contact` 作為賽事類型（matchType），但目前缺少對應的裁判計分介面與觀眾顯示介面。SPEC-v7 定義了一套以「亮牌」為核心的 Contact 裁判計分板——以犯規牌與擊倒牌決定勝負，不計算數字積分，需從頭建立完整的前後端功能。

## What Changes

- **裁判計分介面（Contact 亮牌模式）**：計分裁判操作犯規牌（亮在犯規方）與擊倒牌（亮在被擊倒方），每方最多顯示 2 張；第 3 張由裁判手動按鈕宣告勝者
- **黃牌外觀**：撲克牌長寬比（約 2:3 直式長方形）、黃色
- **主計時 3 分鐘**：裁判手動開始／暫停
- **黃金分鐘機制**：最多 2 次，每次觸發後計時重設為 1:00 並暫停，裁判手動按開始才倒數
- **傷停**：沿用寢技（ne-waza）傷停機制——紅／藍各自觸發，暫停主計時，觀眾端在對應方顯示傷停倒數
- **獲勝判定（全部手動）**：降伏勝、擊倒勝由裁判按鈕觸發；犯規失格亦由裁判手動確認
- **觀眾顯示介面**：顯示黃牌狀態、計時器、傷停倒數、黃金分鐘次數標示、勝負結果；無數字分數欄位

## Capabilities

### New Capabilities

- `contact-card-board`: Contact 亮牌計分板核心——裁判介面的犯規牌／擊倒牌加減按鈕、黃牌計數 Signal、手動勝負宣告按鈕；觀眾端的黃牌視覺元件（撲克牌比例、黃色）與勝負覆蓋層；後端 Match 模型新增 foulCount／knockdownCount 欄位與相應 Socket.IO 事件
- `contact-golden-minute`: 黃金分鐘機制——裁判端觸發按鈕（最多 2 次計數），觸發後計時重設為 60 秒並暫停等待裁判手動開始；觀眾端顯示黃金分鐘次數標示

### Modified Capabilities

- `ne-waza-injury-ownership`: 新增 contact 類型支援，使傷停機制可在 contact 場次中使用（原spec 僅涵蓋 ne-waza）

## Impact

- Affected specs: `contact-card-board`（new）、`contact-golden-minute`（new）、`ne-waza-injury-ownership`（delta）
- Affected code:
  - `backend/src/models/Match.ts` — 新增 `foulCount: { red, blue }`、`knockdownCount: { red, blue }`、`goldenMinuteCount` 欄位
  - `backend/src/controllers/matchScoreController.ts` — 處理 contact 場次的犯規／擊倒增減邏輯
  - `backend/src/sockets/index.ts` — 新增 `match:foul-updated`、`match:knockdown-updated`、`match:golden-minute`、`match:winner-declared` Socket.IO 事件
  - `frontend/src/app/features/match-referee/` — 新增 contact 模式分支：foulSignal、knockdownSignal、goldenMinuteSignal、手動勝負按鈕
  - `frontend/src/app/features/match-audience/` — 新增 contact 模式觀眾顯示：黃牌列、計時器、黃金分鐘標示、傷停倒數
