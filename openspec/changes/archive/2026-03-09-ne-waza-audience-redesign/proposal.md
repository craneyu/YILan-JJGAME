## Why

寢技觀眾計分板目前採用左中右三欄設計，資訊密度低、字型偏小，在大螢幕投影時可讀性不佳。同時，傷停計時無歸屬方（不顯示是哪一方受傷），且觀眾畫面完全未顯示傷停資訊。需依競賽計分板慣例重新設計版面。

## What Changes

- 觀眾計分板從三欄改為**上下兩列**（紅方一列、藍方一列）+ 底部計時器列
- 每列結構：左側選手姓名（大字）、中右側 優勢/警告 數值（小字標籤）、最右側彩色背景大分數方塊
- 標籤改用中文：「優勢」、「警告」
- 傷停計時改為**有歸屬**：裁判指定紅方或藍方傷停，計時器顯示在對應列內
- 裁判介面新增**每側傷停按鈕**（移除共用傷停按鈕），並透過新 Socket 事件傳遞歸屬方
- 整體背景改為近黑深灰，字型採粗黑體

## Capabilities

### New Capabilities

- `ne-waza-audience-layout`: 上下兩列計分板布局，含優勢/警告/大分數/傷停區塊
- `ne-waza-injury-ownership`: 傷停計時有歸屬（紅/藍），裁判端選擇方向，觀眾端對應列顯示

### Modified Capabilities

（無現有 spec 異動）

## Impact

- Affected code:
  - `frontend/src/app/features/match-audience/match-audience.component.html`（版面完整重寫）
  - `frontend/src/app/features/match-audience/match-audience.component.ts`（新增傷停歸屬 signal）
  - `frontend/src/app/features/match-referee/match-referee.component.html`（傷停按鈕移至各側）
  - `frontend/src/app/features/match-referee/match-referee.component.ts`（傷停歸屬邏輯）
  - `frontend/src/app/core/services/socket.service.ts`（新增 `injury:started` / `injury:ended` 事件）
  - `backend/src/sockets/index.ts`（廣播新傷停事件）
