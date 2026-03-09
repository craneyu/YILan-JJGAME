## Why

現有寢技裁判介面的計分按鈕缺少 +1/-1（雖寢技不用）、無法扣分、按鈕缺乏中文標示，且 STALLING 功能未規劃。需要依據實際寢技裁判操作需求，重新設計計分按鈕排列，提升操作直覺性與速度。

## What Changes

- 移除 +1 / -1 按鈕（寢技規則無 1 分）
- 重新排列每側計分按鈕為兩行：正向行（+2, +3, +4, +A 優勢, +P 警告, STALLING）、負向行（-2, -3, -4, -A 優勢, -P 警告）
- +A / -A / +P / -P 按鈕加上中文說明（「優勢」、「警告」），降低誤操作率
- STALLING 按鈕改為每側各自獨立，直接對應拖延方記錄
- 現有「優勢」獨立按鈕與「+警告 / -警告」改為整合入兩行格式，版面更簡潔

## Capabilities

### New Capabilities

（無新功能，屬於既有 UI 重構）

### Modified Capabilities

- `ne-waza-scoring`: 計分按鈕排列、STALLING 操作位置、中文標示規格調整

## Impact

- Affected code:
  - `frontend/src/app/features/match-referee/match-referee.component.html`（按鈕排列重構）
  - `frontend/src/app/features/match-referee/match-referee.component.ts`（新增 STALLING 計分邏輯）
