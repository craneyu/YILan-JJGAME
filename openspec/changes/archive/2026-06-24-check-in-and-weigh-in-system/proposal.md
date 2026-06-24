## Why

目前系統沒有任何「賽前狀態管理」機制——當選手棄權、過磅失格、或檢錄未到時，賽程必須由 admin 手動把場次改 bye 或刪除，極易在現場壓力下漏掉，且裁判在開賽前無法快速知道紅藍雙方是否符合出賽資格。

我們需要一個新的「檢錄員」角色，把過磅與檢錄兩個階段制度化：
- **過磅** 只適用於對打（fighting）、寢技（ne-waza）、格鬥（contact）三項——這些有體重級別。過磅失格的選手不需再進入後續檢錄。
- **檢錄** 在比賽前隨時進行，所有項目（含演武 Duo / Creative）皆需要。檢錄未到由檢錄員紀錄。
- 失格或未到 SHALL 立即觸發場次調整：對手獲 bye 勝，且沿 `redSource` / `blueSource` 鏈條 propagate 到下游。
- 裁判介面在開賽前 SHALL 顯示紅藍雙方的檢錄/過磅狀態徽章。

## What Changes

1. **新增 `check_in_officer` 角色**，與 admin 共用一個介面入口（admin 視為超集）。
2. **資料模型擴充**：在 `Team.members[]` 由 `string[]` 升級為 `IMember[]`，新增每個成員的 `weighInStatus`、`checkInStatus`、`weighInAt`、`checkInAt`、`disqualifyReason` 欄位。
3. **新增前端頁面** `/check-in`，含兩個 tab：「過磅」與「檢錄」。
   - 過磅 tab 只列出 fighting / ne-waza / contact 項目的選手；演武項目選手在過磅 tab 不顯示。
   - 檢錄 tab 列出所有項目的選手；過磅失格者標為「不需檢錄」灰階顯示。
4. **狀態傳遞與 propagation**：選手被標為 `weighInStatus: failed` 或 `checkInStatus: absent` 時，後端 SHALL 自動：
   - 找出該選手在所有 `pending` 場次中佔據的紅/藍方，將該場 `isBye = true`、對方獲勝、`status: completed`、`result.method = 'dq'`。
   - 對每場 propagate 至下游（沿用既有 `matchPropagation` 工具）。
5. **裁判介面顯示資格徽章**：fighting / ne-waza / contact referee 場次詳情頁的紅藍方姓名旁，顯示 ✅ 已檢錄 / ⚠️ 未檢錄 / ❌ 過磅失格 / ⛔ 檢錄未到 徽章。
6. **演武團體計**：Kata Duo / Creative 的 team-level 檢錄狀態為「所有成員 `checkInStatus === 'present'`」的 derived computed，不額外儲存。

## Non-Goals

- 不引入新的 `Player` collection；狀態仍掛在 `Team.members[i]`，避免大規模 schema migration。
- 不為過磅紀錄體重數值——只記過/未過（pass/fail）+ 原因；體重在現場由電子磅秤紙本核對。
- 不為檢錄與過磅做雙人簽核流程；單一 `check_in_officer` 操作即生效。
- 不修改現有 propagation 機制本身（沿用 `backend/src/utils/matchPropagation.ts`），只新增觸發來源。
- 不變更現有 Excel 匯入格式；初始 `weighInStatus`、`checkInStatus` 預設 `pending`。
- 不處理「過磅後重檢」流程（一次失格即終局）。
- 不在本 proposal 加入 audit log（誰在何時改了誰的狀態）；若日後需要再另開 change。

## Capabilities

### New Capabilities

- `participant-check-in`: 新增檢錄員角色、過磅/檢錄狀態機、檢錄頁面、與既有 match propagation 的整合觸發。

### Modified Capabilities

- `user-account-management`: 新增 `check_in_officer` 為合法 role enum 值。
- `jujitsu-match-management`: 新增「選手喪失出賽資格 SHALL 觸發場次 bye 化與 propagate」要求；裁判場次詳情頁 SHALL 顯示紅藍方資格徽章。

## Impact

- Affected specs: `participant-check-in`（new）、`user-account-management`、`jujitsu-match-management`
- Affected code:
  - New:
    - frontend/src/app/features/check-in/check-in.component.ts
    - frontend/src/app/features/check-in/check-in.component.html
    - frontend/src/app/features/check-in/check-in.component.css
    - backend/src/controllers/checkInController.ts
    - backend/src/routes/checkIn.ts
    - backend/src/utils/forfeitPropagation.ts
  - Modified:
    - backend/src/models/Team.ts（members: string[] → IMember[]）
    - backend/src/models/User.ts（role enum 加 check_in_officer）
    - backend/src/middleware/auth.ts（role 守衛接受 check_in_officer）
    - backend/src/index.ts（註冊 /api/v1/check-in 路由）
    - backend/src/seeds/initialUsers.ts（新增 checkin/checkin123 種子帳號）
    - backend/src/utils/matchPropagation.ts（新增觸發點 forfeitMatch）
    - backend/src/controllers/teamController.ts（匯入時 members 帶預設狀態）
    - frontend/src/app/core/services/auth.service.ts（role union 加 check_in_officer）
    - frontend/src/app/core/guards/role.guard.ts
    - frontend/src/app/app.routes.ts（新增 /check-in 路由）
    - frontend/src/app/features/login/login.component.ts（登入後依 role 跳轉）
    - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html（顯示資格徽章）
    - frontend/src/app/features/fighting-referee/fighting-referee.component.html
    - frontend/src/app/features/contact-referee/contact-referee.component.html
  - Removed: (none)

### Socket.IO 廣播

新增事件（廣播至 eventId 房間）：
```ts
io.to(eventId).emit("participant:status-changed", {
  teamId: string;
  memberIndex: number;
  memberName: string;
  weighInStatus: 'pending' | 'passed' | 'failed' | 'n/a';
  checkInStatus: 'pending' | 'present' | 'absent';
  disqualifyReason?: string;
});

io.to(eventId).emit("match:forfeit-applied", {
  forfeitedMatchIds: string[];
  propagatedMatchIds: string[];
  reason: 'weigh-in-failed' | 'check-in-absent';
});
```

### API 規範

新增端點：
```
GET    /api/v1/events/:eventId/participants
  — 列出該事件所有 Team 的成員與狀態（check_in_officer + admin）
PATCH  /api/v1/events/:eventId/participants/:teamId/:memberIndex/weigh-in
  body: { status: 'passed' | 'failed', reason?: string }
PATCH  /api/v1/events/:eventId/participants/:teamId/:memberIndex/check-in
  body: { status: 'present' | 'absent', reason?: string }
```

兩個 PATCH 端點成功後 SHALL 觸發 forfeitPropagation 並廣播 `participant:status-changed` 與（如有 match 被 bye 化）`match:forfeit-applied`。

### 資料模型變更（IMember）

```ts
interface IMember {
  name: string;                                                           // 既有姓名
  weighInStatus: 'pending' | 'passed' | 'failed' | 'n/a';                 // n/a 用於演武選手（免過磅）
  checkInStatus: 'pending' | 'present' | 'absent';
  weighInAt?: Date;
  checkInAt?: Date;
  disqualifyReason?: string;                                              // 失格/未到原因
}
```

**Migration 策略**：寫一次性 migration script，把所有現有 `members: string[]` 升級為 `IMember[]`，依該 team 的 `competitionType` 決定 `weighInStatus`（Duo/Show → `n/a`；其餘 → `pending`），其他狀態欄位設為 `pending`。

### Glassmorphism 設計規範

- 檢錄頁沿用 `.glass-card` 與 `.glass-btn`。
- 狀態徽章顏色：
  - 已過磅 / 已檢錄：`bg-emerald-500/20 text-emerald-300`
  - 失格 / 未到：`bg-red-500/20 text-red-300`
  - 待處理：`bg-white/10 text-white/60`
  - 不適用（演武免過磅）：`bg-white/5 text-white/30 italic`

### 角色與授權

- `check_in_officer` SHALL 通過 `verifyToken` 後可呼叫 `/api/v1/events/:id/participants/*` 全部端點；admin 共享同樣權限。
- 不擴充 JWT payload；沿用 `{ userId, role, eventId? }`。

### Bundle 影響

新增 1 個 standalone 元件、3 個 controller/route/util 檔案。預期 frontend 增加 <30 kB（含 HTML + TS + Tailwind utility 重用），低於 500 kB 警告閾值。
