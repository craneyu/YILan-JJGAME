## Context

觀眾顯示頁（`fighting-audience`）目前以橫排三個數字卡片呈現 P1/P2/P3 的 IPPON 計數。卡片顯示標籤與數字，值 > 0 時變黃色。此設計視覺張力不足，觀眾無法直覺感受得分瞬間。

新設計改為垂直圓形燈號：三顆圓形燈垂直排列，標籤置於圓心，有得分時燈亮（黃色），每次值增加時閃爍一次後維持恆亮。

此變更**純屬前端視覺重構**，不涉及後端、Socket.IO 事件、資料模型或 API。

## Goals / Non-Goals

**Goals:**

- 將 P1/P2/P3 由橫排數字卡片改為垂直圓形燈號
- 支援 RWD 自動縮放（sm/md/lg/xl 斷點）
- 每次值增加時觸發閃爍動畫，完成後維持恆亮
- 標籤文字（P1/P2/P3）置於圓心
- 移除外層方形 border 框

**Non-Goals:**

- 不修改裁判介面（`fighting-referee`）的 P1/P2/P3 顯示
- 不修改任何後端邏輯、資料模型或 Socket.IO 事件
- 不引入新套件

## Decisions

### 使用 effect() + setTimeout 偵測值變化觸發閃爍

**決策**：在 Angular component 中用 `effect()` 監聽 `redParts` / `blueParts` signal，逐 index 比對前後值，若任一 index 增加則設 `redFlashingIndex` / `blueFlashingIndex` signal 為該 index，並在 700ms 後清除（設回 -1）。

**替代方案考慮**：
- 純 CSS（`:has`、attribute selector）：無法區分「剛增加」vs「已是某值」，閃爍時機無法精確控制。
- RxJS Subject：非必要，專案規範優先使用 Signals。

**選擇理由**：`effect()` + setTimeout 最符合專案 Signals 優先規範，精確捕捉「值增加瞬間」，實作簡單。

### CSS @keyframes 定義於 styles.css

**決策**：在 `frontend/src/styles.css` 的 `@layer components` 區塊新增 `.penalty-light-flash` class（內含 `@keyframes`），供 HTML template 以 class binding 套用。

**替代方案**：寫在元件的 inline styles。

**選擇理由**：元件 CSS 有 4kB 警告限制；`styles.css` 全域定義，未來其他元件若需相同動畫可複用。

### RWD 圓形尺寸以 Tailwind 斷點 class 實作

| 斷點 | 圓形尺寸 | 文字大小 |
|------|----------|----------|
| 預設（sm） | `w-10 h-10` | `text-xs` |
| md | `w-14 h-14` | `text-sm` |
| lg | `w-16 h-16` | `text-base` |
| xl | `w-20 h-20` | `text-lg` |

## Risks / Trade-offs

- [Risk] `effect()` 在 OnPush 元件首次初始化時可能觸發一次，導致頁面載入時閃爍 → Mitigation：`effect()` 內記錄 `previousParts`，初始化時直接賦值而不觸發 flash；僅在 `previousParts` 非 null 時才比較差異。
- [Trade-off] setTimeout 是命令式副作用，無法被 Angular 測試工具（fakeAsync）自動管理 → 接受此風險，此元件無單元測試覆蓋需求。
