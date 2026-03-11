## Context

現行柔術比賽計分系統（對打/寢技/格鬥）在裁判端（`match-referee`）與觀眾端（`match-audience`）存在以下問題：

1. 傷停圖示使用 Font Awesome `faBriefcaseMedical`，與其他 CSS-only 元素風格不一致
2. 傷停計時每次啟動都重設為 120 秒，未實作累積制邏輯
3. 傷停結束後顯示消失，選手/觀眾無法知道剩餘時間
4. 警告無上限檢查
5. 裁判端保留了「取消上一筆」(`undoLast`) 按鈕，需移除
6. 觀眾端計分區視覺辨識度不足（缺框線/陰影/標籤），警告以數字呈現而非視覺化黃牌

此次修改全部集中在前端兩個元件，無後端邏輯變動，無新 Socket.IO 事件，無資料模型變更。

## Goals / Non-Goals

**Goals:**

- 傷停 icon 改以純 CSS 繪製（紅底白字「+」圓角方塊）
- 傷停計時改為累積制，依運動項目設定初始上限
- 傷停結束後計時暫停但 UI 顯示保留
- 強制警告上限 4 個
- 裁判端移除「取消上一筆」按鈕
- 裁判端計分區底色加上淡粉紅/淡粉藍
- 觀眾端計分區加框線、陰影、「得分」標籤
- 觀眾端警告/優勢位置對調
- 觀眾端警告改為 2×2 黃牌格呈現

**Non-Goals:**

- 傷停相關後端 API 或 Socket.IO 事件不修改
- 不新增傷停記錄到資料庫
- 不影響計分邏輯

## Decisions

### 傷停計時累積制的狀態設計

**問題**：現行每次啟動傷停都重設剩餘時間，不符合累積制規格。

**決策**：傷停剩餘時間（`redInjuryRemaining` / `blueInjuryRemaining`）的初始值依運動項目設定（寢技/對打 = 120、格鬥 = 180），啟動傷停時**不重設**，直接從當前剩餘值繼續倒數。初始值僅在**比賽開始**時設定一次。

比賽類型來源：從 `activeMatch()` 的 `sportType`（或 `matchDuration`）欄位判斷。若 `matchDuration === 180`（格鬥 3 分鐘）→ 傷停上限 180 秒；否則 120 秒。

**替代方案**：在後端儲存傷停剩餘時間 → 過度設計，LAN 環境下前端管理即可。

### 傷停顯示狀態管理

**問題**：傷停結束後 `redInjuryActive` 變為 `false`，導致顯示消失。

**決策**：新增獨立的顯示控制 signal `redInjuryVisible` / `blueInjuryVisible`，一旦傷停啟動過則設為 `true` 且不再關閉（比賽結束前保持顯示）。`redInjuryActive` 僅控制倒數是否在進行中，`redInjuryVisible` 控制 UI 是否顯示。

### 傷停 icon 改為 CSS 方塊

**決策**：使用 inline div 取代 `<fa-icon>`，樣式：
```
bg-red-600 text-white font-bold rounded-md flex items-center justify-center
```
大小與傷停按鈕的圖示區域一致，使用 `w-6 h-6` 或 `w-5 h-5`（與周圍文字大小對齊）。

### 警告黃牌格的渲染

**決策**：使用 `@for` 迴圈渲染 4 個格子，index < warningCount 的格子套用黃色 (`bg-yellow-400`)，其餘為灰色 (`bg-white/20`)。格子大小固定，2×2 排列用 `grid grid-cols-2 gap-1`。

### 裁判端計分區底色

**決策**：使用 Tailwind 語義色彩 `bg-red-950/30`（紅方）和 `bg-blue-950/30`（藍方）作為淡粉背景，維持 Glassmorphism 整體風格。

### 觀眾端框線與陰影

**決策**：在紅/藍方列的 `rounded-2xl` 容器上加上：
- 紅方：`border border-red-400/40 shadow-lg shadow-red-900/20`
- 藍方：`border border-blue-400/40 shadow-lg shadow-blue-900/20`

## Risks / Trade-offs

- [風險] `activeMatch()` 的 `matchDuration` 欄位若不存在，傷停上限會 fallback 到 120 秒 → 需確認 Match 資料模型有此欄位，或用其他方式判斷格鬥/對打
- [風險] 傷停剩餘時間在前端管理，若頁面重新整理則歸零 → 屬已知限制，LAN 賽事環境中裁判不應在比賽中途重整頁面，可接受
