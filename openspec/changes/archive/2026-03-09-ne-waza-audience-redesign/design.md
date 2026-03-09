## Context

現有觀眾計分板為左中右三欄，紅方名字+大分數在左，計時器居中，藍方在右。
傷停計時為裁判端共用功能，無歸屬方，觀眾端無任何傷停資訊。

## Goals / Non-Goals

**Goals:**

- 觀眾計分板版面改為上下兩列 + 底部計時器，模仿專業競賽計分板
- 傷停計時有歸屬（紅/藍），透過 Socket 事件同步到觀眾端
- 裁判介面傷停按鈕移至各側（紅方傷停 / 藍方傷停）

**Non-Goals:**

- 不改動計分邏輯（分數、優勢、警告的計算方式）
- 不改動後端資料模型（Match schema）
- 不新增傷停計時的後端持久化

## Decisions

### 觀眾版面：上下兩列布局

每列為水平 flex：
- 左：選手姓名（白色 `font-black text-5xl`）+ 傷停提示（條件顯示）
- 中：優勢/警告標籤 + 數值（灰色小字標籤，白色數字）
- 右：彩色背景方塊（紅/藍）+ 超大白色分數（`text-8xl font-black`）

底部獨立列：計時器靠右，灰色大字（`text-6xl font-mono text-white/40`）。
背景：`bg-gray-950`（近黑）。

### 傷停 Socket 事件新增

新增兩個 Socket 事件：
- `injury:started` — payload: `{ eventId, matchId, side: 'red' | 'blue', durationSec: number }`
- `injury:ended` — payload: `{ eventId, matchId, side: 'red' | 'blue' }`

裁判端觸發後由後端廣播至 eventId 房間，觀眾端訂閱並更新各側的 `injuryActive` 與 `injuryRemaining` signal。

### 裁判介面：傷停按鈕下移至各側

從計時器共用區移除 `[+傷停 (2分)]`，改在紅方與藍方計分卡底部各加一顆 `[傷停 2分]`。
點擊後啟動該側傷停計時並廣播 `injury:started` 事件（帶 `side`）。

## Risks / Trade-offs

- [風險] 觀眾端傷停計時與裁判端不同步（網路延遲）：前端以收到 `injury:started` 的伺服器時間為基準重算，誤差 < 1秒可接受
- [取捨] 傷停不持久化：重新整理觀眾頁面後傷停資訊會消失，但傷停屬短暫狀態，可接受
