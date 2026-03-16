## Context

系統已有 `contact` 作為合法 matchType（jujitsu-match-management spec 定義），但尚無對應的裁判計分介面或觀眾顯示邏輯。現有的 `match-referee` 元件已根據 matchType 切換不同模式（ne-waza、fighting），contact 目前為空白分支。SPEC-v7 定義了純亮牌制計分板，不涉及任何數字積分，與其他模式完全獨立。

## Goals / Non-Goals

**Goals:**

- 為 `contact` matchType 建立完整裁判操作介面（犯規牌、擊倒牌、黃金分鐘、傷停、手動勝負宣告）
- 為 `contact` matchType 建立觀眾顯示介面（黃牌視覺、計時器、黃金分鐘標示、傷停倒數、勝負結果）
- 擴充 Match 後端模型以儲存犯規/擊倒計數與黃金分鐘計數
- 傷停機制沿用 ne-waza 現有實作，擴充支援 contact matchType

**Non-Goals:**

- 不修改 ne-waza 或 fighting 模式的任何現有功能
- 不建立新的路由或角色——裁判仍使用現有 match-referee 路由
- 不支援自動勝負判定——所有勝負均由裁判手動確認

## Decisions

### 在現有 match-referee 元件中新增 contact 模式分支

在 `match-referee.component.ts` 以 `matchType === 'contact'` 作為條件，渲染 contact 專屬模板區塊。原因：路由與角色認證已共用，新增分支比建立全新元件更省工且維持一致性。替代方案（新元件）需新增路由、守衛，工程量大但複雜度不對等。

### 黃牌以純 CSS 元素實作（非圖片）

撲克牌比例（aspect-ratio: 2/3）以 Tailwind `aspect-[2/3]` 實現，背景 `bg-yellow-400`，圓角 `rounded-md`。原因：無需額外資源、可即時更新狀態、符合現有 Tailwind-first 規範。

### 計時器邏輯獨立於 Signal 中管理

主計時（3 分鐘）與黃金分鐘計時（60 秒）各自使用獨立 `signal<number>`（剩餘秒數）與 `setInterval`，由裁判手動開始/暫停觸發。黃金分鐘觸發時清除主計時 interval，重設為 60 秒，進入 paused 狀態等待手動開始。

### 後端新增 contact 專屬欄位至 Match 模型

在 Match schema 新增：
```typescript
foulCount: { red: { type: Number, default: 0 }, blue: { type: Number, default: 0 } }
knockdownCount: { red: { type: Number, default: 0 }, blue: { type: Number, default: 0 } }
goldenMinuteCount: { type: Number, default: 0 }
```
原因：與現有 Match 模型集中管理，避免另建 collection。欄位有 default 值，不影響既有 ne-waza/fighting 場次。

### Socket.IO 事件命名以 match:contact- 前綴區隔

新增事件：
- `match:contact-foul-updated` — payload: `{ matchId, side: 'red'|'blue', foulCount: { red, blue } }`
- `match:contact-knockdown-updated` — payload: `{ matchId, side: 'red'|'blue', knockdownCount: { red, blue } }`
- `match:contact-golden-minute` — payload: `{ matchId, goldenMinuteCount: number }`
- `match:contact-winner` — payload: `{ matchId, winner: 'red'|'blue', method: 'submission'|'knockdown'|'foul-dq' }`

原因：避免與 fighting 模式的 `match:foul-updated` 等事件命名衝突，方便前端依型別過濾。

## Risks / Trade-offs

- **match-referee 元件持續膨脹** → 日後可按 matchType 拆分為獨立元件，但現階段共用路由帶來的收益大於拆分成本
- **Timer 精度** → `setInterval(1000)` 在瀏覽器 tab 後台可能飄移；LAN 賽事環境下裁判不切換 tab，風險可接受
- **黃金分鐘最多 2 次硬限制** → 前端 Signal computed 防止第 3 次，後端同步驗證 `goldenMinuteCount < 2`

## Open Questions

- 黃金分鐘規則（首次有效攻擊判定邏輯）待確認，目前僅實作計次與計時，勝負判定仍為手動
