## 1. 後端資料模型擴充

- [x] 1.1 在 Match 模型新增 contact 專屬欄位（後端新增 contact 專屬欄位至 Match 模型）：`foulCount { red, blue }`、`knockdownCount { red, blue }`、`goldenMinuteCount`（match model stores contact-specific foul and knockdown counts；match model stores golden minute count）
- [x] 1.2 新增 `PATCH /api/v1/matches/:id/contact-action` 路由與 controller，處理犯規牌加減防止低於 0（referee can add or remove a foul card for either side）
- [x] 1.3 在 contact-action controller 新增擊倒牌加減邏輯，防止低於 0（referee can add or remove a knockdown card for either side）
- [x] 1.4 新增 `PATCH /api/v1/matches/:id/contact-winner` 路由與 controller，接受 winner/method 並更新 Match 狀態（referee manually declares match winner）
- [x] 1.5 在 sockets/index.ts 新增廣播方法：`match:contact-foul-updated`、`match:contact-knockdown-updated`、`match:contact-golden-minute`、`match:contact-winner`（socket.io 事件命名以 match:contact- 前綴區隔）

## 2. 後端黃金分鐘邏輯

- [x] 2.1 在 contact-action controller 新增 `goldenMinute` 動作類型，驗證 `goldenMinuteCount < 2`，更新計數並廣播 `match:contact-golden-minute`（referee can trigger golden minute up to twice）

## 3. 後端傷停支援擴充

- [x] 3.1 確認現有傷停 API（injury:started / injury:ended）的 matchType 過濾條件，擴充使其接受 `contact` 類型（injury timeout is supported for contact matches）

## 4. 裁判介面 — Contact 模式分支

- [x] 4.1 在 `match-referee.component.ts` 新增 contact 模式判斷分支（在現有 match-referee 元件中新增 contact 模式分支），加入 Signal：`foulCount`、`knockdownCount`、`goldenMinuteCount`
- [x] 4.2 在 `match-referee.component.html` 新增 contact 模式模板區塊：紅／藍各自的 [+犯規] [-犯規] 按鈕，呼叫 contact-action API（referee can add or remove a foul card for either side）
- [x] 4.3 新增紅／藍各自的 [+擊倒] [-擊倒] 按鈕，呼叫 contact-action API（referee can add or remove a knockdown card for either side）
- [x] 4.4 新增黃金分鐘按鈕 [黃金分鐘]，`goldenMinuteCount >= 2` 時套用 `.disabled-btn`（referee can trigger golden minute up to twice）
- [x] 4.5 新增手動勝負宣告按鈕：降伏勝／擊倒勝／犯規失格各紅藍方（共 6 顆），呼叫 contact-winner API（referee manually declares match winner）
- [x] 4.6 在裁判介面紅／藍側各加傷停按鈕，觸發 injury:started 事件（injury timeout is supported for contact matches）

## 5. 裁判介面 — 計時器（Contact 模式）

- [x] 5.1 Contact 模式計時器初始化為 180 秒（3 分鐘），裁判手動開始／暫停，以 Signal 管理剩餘秒數（計時器邏輯獨立於 Signal 中管理）
- [x] 5.2 黃金分鐘觸發時清除主計時 interval，Signal 重設為 60 秒進入暫停狀態；裁判按 [開始] 才啟動倒數（referee manually starts golden minute countdown）

## 6. 觀眾介面 — Contact 模式顯示

- [x] 6.1 在 `match-audience.component.ts` 訂閱 `match:contact-foul-updated`、`match:contact-knockdown-updated`，更新對應 Signal（audience display shows card board without numerical scores）
- [x] 6.2 在 `match-audience.component.html` 為 contact matchType 渲染黃牌列：以 `aspect-[2/3] bg-yellow-400 rounded-md` 元素代表每張牌，犯規與擊倒各一列（yellow card visual element uses poker card proportions；黃牌以純 CSS 元素實作（非圖片））
- [x] 6.3 隱藏數字分數區塊（不渲染 PART 分數、total score），contact matchType 下不顯示（audience display loads for a contact match）
- [x] 6.4 訂閱 `match:contact-golden-minute`，顯示黃金分鐘次數標示（audience display shows golden minute indicator）
- [x] 6.5 訂閱 `match:contact-winner`，顯示全螢幕勝負覆蓋層（audience sees winner overlay）
- [x] 6.6 訂閱 `injury:started` / `injury:ended`，在對應方顯示傷停倒數（contact match audience sees injury countdown）

## 7. 驗收確認

- [x] 7.1 執行 `cd frontend && npm run build`，確認 Initial bundle 未超過 500kB
