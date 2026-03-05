## Why

### 動機與背景
目前的創意演武賽序裁判介面中，隊伍清單並未區分已完賽與未完賽的隊伍。這導致裁判難以追蹤賽程進度，且若需回頭檢視已完賽隊伍的成績（含計時、各項得分與違例）時，缺乏直觀的查看入口。

## What Changes

### 方案描述
- **隊伍清單標記**：在 `CreativeSequenceJudgeComponent` 的隊伍清單中，若隊伍已完成評分，則在名稱旁顯示「已完賽」標籤。
- **成績唯讀檢視**：當賽序裁判點選「已完賽」隊伍時，右方控制區塊改為顯示該隊伍的最終成績結算資訊（技術分、表演分、計時結果、違例扣分詳情）。
- **操作鎖定**：針對已完賽隊伍，右方區塊將隱藏計時器控制按鈕與評分開放按鈕，防止對已結算成績進行誤操作。
- **資料模型擴充**：後端 `GET /events/:id/teams` 端點需回傳隊伍的完賽狀態（可根據 `CreativeScore` 或 `CreativeGameState` 判定）。

### Non-goals（不做什麼）
- 不提供已完賽隊伍的成績修改功能（需透過管理員介面或其他重置流程）。
- 不影響雙人演武（Duo）的賽序裁判介面。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `creative-embu-flow`: 擴充隊伍資訊回傳格式，加入完賽狀態標記與結算成績資訊。
- `creative-show-score-display`: 在賽序裁判介面新增已完賽隊伍的結算成績唯讀顯示模式。

## Impact

- **Affected code**:
  - `backend/src/controllers/teamController.ts` (調整隊伍列表回傳資料)
  - `frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts` (邏輯判斷與狀態管理)
  - `frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html` (UI 標記與唯讀介面呈現)
