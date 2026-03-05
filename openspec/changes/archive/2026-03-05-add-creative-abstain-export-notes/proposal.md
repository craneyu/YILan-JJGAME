## Why

創意演武賽序裁判目前缺少「棄權」功能，若隊伍臨場無法出賽只能手動跳過，流程不規範。匯出 Excel / PDF 成績單時，若隊伍有違例扣分，目前只顯示最終得分，缺乏違例原因說明，不符合正式賽事文件需求。

## What Changes

- 創意演武賽序裁判新增「設定此組棄權」按鈕，點擊後將該隊標記為棄權，並廣播給所有用戶端
- 棄權隊伍在賽序裁判清單中顯示特殊標記（棄權），計分裁判與觀眾端同步顯示棄權狀態
- 棄權可取消（若誤操作），取消後恢復正常賽程
- Admin 匯出 Excel 時，若隊伍有違例扣分，在對應欄位旁加入扣分原因附註（如：超時 -1.0、使用道具 -1.0）
- Admin 匯出 PDF 時，同樣在隊伍得分列顯示扣分原因標記

## Capabilities

### New Capabilities

- `creative-embu-abstain`: 創意演武賽序裁判標記/取消隊伍棄權，含後端 API、Socket.IO 廣播、前端 UI 與各端同步顯示

### Modified Capabilities

- `admin-dashboard`: 匯出 Excel / PDF 新增違例扣分原因欄位，若有扣分則顯示扣分類型與金額

## Impact

- Affected specs: `creative-embu-abstain`（新建）、`admin-dashboard`（修改）
- Affected code:
  - `backend/src/controllers/creativeFlowController.ts` — 新增 abstainTeam / cancelAbstain
  - `backend/src/models/CreativeGameState.ts` — 新增 `abstainedTeamIds` 欄位
  - `backend/src/routes/creativeFlow.ts` — 新增 POST /abstain、POST /abstain-cancel 路由
  - `backend/src/sockets/index.ts` — 新增 `creativeTeamAbstained` / `creativeTeamAbstainCancelled` 廣播
  - `frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts` — 棄權/取消棄權邏輯
  - `frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html` — 棄權按鈕 UI
  - `frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.ts` — 接收棄權廣播
  - `frontend/src/app/features/creative-audience/creative-audience.component.ts` — 接收棄權廣播
  - `frontend/src/app/core/services/socket.service.ts` — 新增 creativeTeamAbstained$ / creativeTeamAbstainCancelled$ Observable
  - `frontend/src/app/features/admin/admin.component.ts` — 匯出 Excel / PDF 加入扣分原因
