## Why

對打與寢技的場次管理列表目前以平鋪方式顯示所有場次，裁判難以快速找到目標場次。需依男/女子組及量級分組，並按場次編號排序，提升操作效率。

## What Changes

- 對打裁判（`fighting-referee`）場次列表改為「組別 → 量級」兩層分組展示
- 寢技裁判（`ne-waza-referee`）場次列表同步套用相同分組結構
- 分組標題顯示：男子組 / 女子組，下方依量級小節列出場次
- 量級依規格表固定順序排列（男子：-56、-62、-69、-77、-85、-94、+94；女子：-49、-55、-62、-70、+70）
- 同量級內場次依 `scheduledOrder` 升序排列

## Capabilities

### New Capabilities

- `match-list-grouping`: 場次列表依組別與量級分組顯示，含固定量級排序邏輯

### Modified Capabilities

（none）

## Impact

- Affected specs: `match-list-grouping`（新建）
- Affected code:
  - `frontend/src/app/features/fighting-referee/fighting-referee.component.ts`
  - `frontend/src/app/features/fighting-referee/fighting-referee.component.html`
  - `frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts`
  - `frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html`
- 無後端變更、無新套件、無 Socket.IO 事件異動
