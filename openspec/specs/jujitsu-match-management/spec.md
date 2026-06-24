# jujitsu-match-management Specification

## Purpose

TBD - created by archiving change 'add-ne-waza-scoring'. Update Purpose after archive.

## Requirements

### Requirement: Admin can create matches via CSV/Excel import

The system SHALL allow Admin to import match schedules by uploading a CSV or Excel file through the Admin dashboard.

The import file SHALL contain the following columns: `項目` (matchType), `組別` (category), `分級` (tier), `量級` (weightClass), `回合` (round), `場次序` (matchNo/scheduledOrder), `紅方姓名` (redPlayerName), `紅方隊名` (redTeamName), `藍方姓名` (bluePlayerName), `藍方隊名` (blueTeamName).

Valid values for `項目` SHALL be: `ne-waza`, `fighting`, `contact`.

Valid values for `組別` SHALL be: `male`, `female`, `mixed`.

For `項目 = ne-waza`, valid values for `分級` SHALL be one of these Chinese labels and SHALL be mapped to the corresponding `MatchTier` code:

| Chinese label | MatchTier code |
| --- | --- |
| 幼兒組 | KID |
| 國小低年級組 | EL |
| 國小中年級組 | EM |
| 國小高年級組 | EH |
| 青少年國中組 | JH |
| 青少年高中組 | SH |
| 公開組 | OPEN |

The system SHALL use `Number(場次序)` as both `matchNo` and `scheduledOrder` on the created Match document. The system SHALL NOT use the row index `i + 1` as a fallback when `場次序` is missing — a missing or non-positive `場次序` value SHALL reject that row with an error message.

For ne-waza imports, when `紅方姓名` or `藍方姓名` matches the pattern `^\s*(\d+)\s*勝\s*$`, the system SHALL:

1. Parse the integer `N` from the placeholder.
2. Set the corresponding side's `redSource` or `blueSource` field on the Match document to `{ fromMatchNo: N, resolved: false }`.
3. Set the corresponding `redPlayer.name` or `bluePlayer.name` to the display string `"N 勝者"` (a space between N and 勝者) and `teamName` to an empty string `""`.

For ne-waza imports, when `藍方姓名` is empty, the system SHALL set `bluePlayer.name = ""`, `bluePlayer.teamName = ""`, `isBye = true`, and `status = "pending"`. The system SHALL NOT auto-complete the match on import.

The system SHALL POST the parsed records to `POST /api/v1/events/:eventId/matches/bulk` and create one Match document per record.

The system SHALL NOT accept the legacy placeholder format `A{N}勝`. When such a value is encountered, the row SHALL be rejected with the error message: `「{N}勝」placeholder 格式不可包含 A 前綴，請將 "{value}" 改為「{N}勝」`.

#### Scenario: Successful ne-waza tournament import

- **WHEN** Admin uploads the file `寢技賽程匯入範本_115錦標賽.xlsx` containing 87 rows that include the `分級` column with the 7 Chinese tier labels above
- **THEN** the system creates 87 Match documents with the corresponding `MatchTier` codes mapped from each Chinese label
- **AND** the system displays a success toast with the count `已成功匯入 87 筆寢技賽程`

#### Scenario: Placement placeholder is parsed and source is recorded

- **WHEN** Admin imports a row where `紅方姓名 = "3勝"` and `紅方隊名 = ""` (empty)
- **THEN** the system creates a Match document with `redSource = { fromMatchNo: 3, resolved: false }`, `redPlayer.name = "3 勝者"`, `redPlayer.teamName = ""`
- **AND** the match `status` remains `pending`

#### Scenario: Bye match is created with isBye flag

- **WHEN** Admin imports a row where `紅方姓名 = "張三"`, `紅方隊名 = "A 隊"`, `藍方姓名 = ""`, `藍方隊名 = ""`
- **THEN** the system creates a Match document with `bluePlayer.name = ""`, `bluePlayer.teamName = ""`, `isBye = true`, `status = "pending"`
- **AND** the match SHALL NOT be auto-completed during import

#### Scenario: matchNo uses the 場次序 column value

- **WHEN** Admin imports a row where `場次序 = 16`
- **THEN** the system creates a Match document with `matchNo = 16` and `scheduledOrder = 16` regardless of the row's position in the spreadsheet

#### Scenario: Legacy A{N}勝 format is rejected

- **WHEN** Admin imports a row where `紅方姓名 = "A3勝"`
- **THEN** the system SHALL reject that row with the error message `「{N}勝」placeholder 格式不可包含 A 前綴，請將 "A3勝" 改為「3勝」`
- **AND** other valid rows in the same upload SHALL still be imported

#### Scenario: Unknown Chinese tier label is rejected

- **WHEN** Admin imports a row where `分級 = "成人組"` (not in the 7-label list)
- **THEN** the system SHALL reject that row with an error message listing the 7 valid labels

#### Scenario: Missing 場次序 is rejected

- **WHEN** Admin imports a row where the `場次序` cell is empty or non-numeric
- **THEN** the system SHALL reject that row with an error message `場次序為必填，且必須為正整數`

#### Scenario: Duplicate scheduledOrder within same matchType + category + weightClass + round

- **WHEN** Admin uploads two rows with identical `項目`, `組別`, `量級`, `回合`, and `場次序`
- **THEN** the system SHALL reject the duplicate row and report a conflict error


<!-- @trace
source: ne-waza-tournament-import
updated: 2026-05-21
code:
  - frontend/src/app/features/match-audience/match-audience.component.html
  - frontend/src/app/core/utils/matchImport.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - backend/src/controllers/matchController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.ts
  - frontend/src/app/core/models/match.model.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - backend/src/utils/matchPropagation.ts
  - frontend/src/app/core/utils/matchDisplay.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - backend/src/sockets/index.ts
  - backend/src/utils/tournament.ts
  - backend/src/seeds/migrateNeWazaTier.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.html
  - backend/src/models/Match.ts
tests:
  - backend/src/utils/__test__/bulkCreateMatches.test.ts
  - backend/src/utils/__test__/updateMatchPropagation.test.ts
  - backend/src/utils/__test__/matchPropagation.test.ts
-->

---
### Requirement: Admin can create individual matches manually

The system SHALL allow Admin to create a single match via `POST /api/v1/matches` with the required fields.

#### Scenario: Create a single ne-waza match

- **WHEN** Admin POSTs a valid match payload with `matchType: 'ne-waza'`
- **THEN** the system creates a Match document with `status: 'pending'`
- **AND** returns the created match in the response


<!-- @trace
source: add-ne-waza-scoring
updated: 2026-03-09
code:
  - docker-compose.yml
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - backend/src/models/User.ts
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - backend/src/models/Match.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - backend/src/index.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/services/auth.service.ts
  - frontend/src/app/app.routes.ts
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/login/login.component.html
  - backend/src/controllers/matchScoreController.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/core/models/match.model.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - backend/src/seeds/initialUsers.ts
  - backend/src/routes/matchScores.ts
-->

---
### Requirement: Match status transitions follow a strict lifecycle

Each Match document SHALL follow the state machine: `pending` → `in-progress` → `completed`.

The system SHALL NOT allow a match to transition from `completed` back to `in-progress` or `pending` via the referee interface.

For Match documents with `isBye === true` and `bluePlayer.name === ""`, the system SHALL additionally allow a direct transition `pending → completed` when the `result` field is provided with `winner = "red"`. The system SHALL NOT allow this `pending → completed` shortcut on non-bye matches.

Admin SHALL be able to override match status via `PATCH /api/v1/matches/:id` (admin-only).

#### Scenario: Referee starts a pending match

- **WHEN** match_referee selects a `pending` match and clicks start
- **THEN** the system transitions the match to `in-progress`
- **AND** emits `match:started` via Socket.IO to the event room

#### Scenario: Referee directly completes a bye match without timer

- **WHEN** match_referee opens a Match with `status = "pending"`, `isBye = true`, `bluePlayer.name = ""` and PATCHes `/api/v1/matches/:id` with `{ status: "completed", result: { winner: "red", method: "judge" } }`
- **THEN** the system SHALL accept the transition `pending → completed`
- **AND** the match.result SHALL be saved as provided
- **AND** propagation SHALL be triggered for any downstream matches whose `redSource.fromMatchNo` or `blueSource.fromMatchNo` equals this match's `matchNo`

#### Scenario: Referee cannot bypass timer on non-bye match

- **WHEN** match_referee tries to PATCH a Match with `isBye = false` directly from `status = "pending"` to `status = "completed"`
- **THEN** the system SHALL return HTTP 409 with the error `不允許從 pending 轉移至 completed`

#### Scenario: Referee attempts to enter a completed match

- **WHEN** match_referee selects a match with `status: 'completed'`
- **THEN** the system SHALL display a locked indicator on that match in the list
- **AND** SHALL NOT allow the referee to enter the scoring interface for that match

#### Scenario: Admin overrides a completed match

- **WHEN** Admin sends `PATCH /api/v1/matches/:id` with `{ status: 'pending' }` and valid admin JWT
- **THEN** the system updates the match status to `pending`


<!-- @trace
source: ne-waza-tournament-import
updated: 2026-05-21
code:
  - frontend/src/app/features/match-audience/match-audience.component.html
  - frontend/src/app/core/utils/matchImport.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - backend/src/controllers/matchController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.ts
  - frontend/src/app/core/models/match.model.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - backend/src/utils/matchPropagation.ts
  - frontend/src/app/core/utils/matchDisplay.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - backend/src/sockets/index.ts
  - backend/src/utils/tournament.ts
  - backend/src/seeds/migrateNeWazaTier.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.html
  - backend/src/models/Match.ts
tests:
  - backend/src/utils/__test__/bulkCreateMatches.test.ts
  - backend/src/utils/__test__/updateMatchPropagation.test.ts
  - backend/src/utils/__test__/matchPropagation.test.ts
-->

---
### Requirement: match_referee role is restricted to match management endpoints

JWT tokens with `role: 'match_referee'` SHALL be accepted by all `/api/v1/matches/*` and `/api/v1/match-scores/*` endpoints.

The system SHALL reject `match_referee` tokens on embu (演武) endpoints: `/api/v1/flow/*`, `/api/v1/scores`, `/api/v1/vr-scores`.

#### Scenario: match_referee accesses match list

- **WHEN** match_referee sends `GET /api/v1/matches?eventId=<id>` with a valid JWT
- **THEN** the system returns the list of matches for that event

#### Scenario: match_referee accesses embu flow endpoint

- **WHEN** match_referee sends `POST /api/v1/flow/open-action` with a valid JWT
- **THEN** the system returns HTTP 403 Forbidden


<!-- @trace
source: add-ne-waza-scoring
updated: 2026-03-09
code:
  - docker-compose.yml
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - backend/src/models/User.ts
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - backend/src/models/Match.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - backend/src/index.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/services/auth.service.ts
  - frontend/src/app/app.routes.ts
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/login/login.component.html
  - backend/src/controllers/matchScoreController.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/core/models/match.model.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - backend/src/seeds/initialUsers.ts
  - backend/src/routes/matchScores.ts
-->

---
### Requirement: Match list is sorted by scheduledOrder

The system SHALL return matches sorted by `scheduledOrder` ascending when queried via `GET /api/v1/matches?eventId=<id>`.

#### Scenario: Retrieve sorted match list

- **WHEN** match_referee requests the match list for an event with 5 matches
- **THEN** the response array is ordered by `scheduledOrder` from lowest to highest

<!-- @trace
source: add-ne-waza-scoring
updated: 2026-03-09
code:
  - docker-compose.yml
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - backend/src/models/User.ts
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - backend/src/models/Match.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - backend/src/index.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/services/auth.service.ts
  - frontend/src/app/app.routes.ts
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/login/login.component.html
  - backend/src/controllers/matchScoreController.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/core/models/match.model.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - backend/src/seeds/initialUsers.ts
  - backend/src/routes/matchScores.ts
-->

---
### Requirement: Match winner propagation to downstream sourced matches

When a Match document transitions to `status = "completed"` with `result.winner` set (one of `red` | `blue`), the system SHALL find all Match documents within the same `eventId` whose `redSource.fromMatchNo` or `blueSource.fromMatchNo` equals the completed match's `matchNo` AND whose corresponding `.resolved` flag is `false`.

For each downstream match found:

1. The system SHALL determine the winner's `name` and `teamName` from the completed match's `redPlayer` or `bluePlayer` (matching `result.winner`).
2. If the downstream match has `redSource.fromMatchNo === N && !redSource.resolved`, the system SHALL set `redPlayer.name = winnerName`, `redPlayer.teamName = winnerTeamName`, `redSource.resolved = true`.
3. If the downstream match has `blueSource.fromMatchNo === N && !blueSource.resolved`, the system SHALL set `bluePlayer.name = winnerName`, `bluePlayer.teamName = winnerTeamName`, `blueSource.resolved = true`.
4. The system SHALL broadcast one Socket.IO event `match:advancement-resolved` to the `eventId` room for each downstream match updated, with payload `{ matchId, side, playerName, teamName, fromMatchNo }`.

The system SHALL NOT re-propagate to downstream matches whose corresponding `.resolved` is already `true` (idempotent on re-completion).

The system SHALL trigger propagation within the same HTTP request handler that transitions the match to `completed`, so that downstream updates and broadcasts complete before the response is returned to the caller.

#### Scenario: Single downstream match is resolved on completion

- **GIVEN** event has Match #3 (red: 陳冠茗 / Jabari, blue: 黃晞恩 / 大隱) status `in-progress` and Match #16 status `pending` with `redSource = { fromMatchNo: 3, resolved: false }`, `redPlayer.name = "3 勝者"`
- **WHEN** referee PATCHes Match #3 with `{ status: "completed", result: { winner: "red", method: "judge" } }`
- **THEN** the system updates Match #16 to `redPlayer.name = "陳冠茗"`, `redPlayer.teamName = "Jabari"`, `redSource.resolved = true`
- **AND** broadcasts `match:advancement-resolved` with payload `{ matchId: "<#16 id>", side: "red", playerName: "陳冠茗", teamName: "Jabari", fromMatchNo: 3 }`

#### Scenario: Multiple downstream matches resolved by a single completion

- **GIVEN** Match #4 is sourced by both Match #76 (`redSource.fromMatchNo = 4`) and Match #80 (`blueSource.fromMatchNo = 4`)
- **WHEN** Match #4 transitions to `completed` with `winner = "blue"`
- **THEN** the system updates both Match #76 and Match #80 with Match #4's blue player info
- **AND** broadcasts `match:advancement-resolved` exactly twice (once per downstream match)

#### Scenario: Re-completing a match does not re-propagate

- **GIVEN** Match #3 already completed and Match #16 already has `redSource.resolved = true`, `redPlayer.name = "陳冠茗"`
- **WHEN** Admin PATCHes Match #3 again with a different `result.winner` value (correcting a recording mistake)
- **THEN** Match #16 SHALL NOT be re-updated (`redSource.resolved` already true means propagation is skipped)
- **AND** Admin SHALL manually correct downstream matches via `PATCH /api/v1/matches/:id` if needed

<!-- @trace
source: ne-waza-tournament-import
updated: 2026-05-21
code:
  - frontend/src/app/features/match-audience/match-audience.component.html
  - frontend/src/app/core/utils/matchImport.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - backend/src/controllers/matchController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.ts
  - frontend/src/app/core/models/match.model.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - backend/src/utils/matchPropagation.ts
  - frontend/src/app/core/utils/matchDisplay.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - backend/src/sockets/index.ts
  - backend/src/utils/tournament.ts
  - backend/src/seeds/migrateNeWazaTier.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.html
  - backend/src/models/Match.ts
tests:
  - backend/src/utils/__test__/bulkCreateMatches.test.ts
  - backend/src/utils/__test__/updateMatchPropagation.test.ts
  - backend/src/utils/__test__/matchPropagation.test.ts
-->

---
### Requirement: Referee match detail view displays participant eligibility badges

The fighting-referee, ne-waza-referee, and contact-referee match detail views SHALL display an eligibility badge next to each side's player name. The badge content SHALL be derived from the corresponding `Team.members[]` entry that matches `redPlayer` / `bluePlayer` by `(name, teamName)`:

| Member status | Badge label | Badge style |
|---|---|---|
| `weighInStatus === 'failed'` | ❌ 過磅失格 | `bg-red-500/20 text-red-300` |
| `checkInStatus === 'absent'` | ⛔ 檢錄未到 | `bg-red-500/20 text-red-300` |
| `checkInStatus === 'present'` AND `weighInStatus ∈ {'passed', 'n/a'}` | ✅ 已檢錄 | `bg-emerald-500/20 text-emerald-300` |
| Any other state (pending) | ⚠️ 未檢錄 | `bg-white/10 text-white/60` |

The badge SHALL update in real time when the referee component receives a `participant:status-changed` Socket.IO event whose `(teamName, memberName)` matches a player in the currently displayed match.

When no corresponding `Team.members[]` entry can be located (e.g., bye match with empty bluePlayer.name), the badge SHALL be omitted for that side.

#### Scenario: Red player has failed weigh-in

- **WHEN** the ne-waza referee opens a match whose `redPlayer = {name: 'A', teamName: 'TeamX'}` and the corresponding Team member has `weighInStatus: 'failed'`
- **THEN** the red side header SHALL display a `❌ 過磅失格` badge

#### Scenario: Live update on participant status change

- **GIVEN** the fighting referee is viewing a match with the red side currently showing `⚠️ 未檢錄`
- **WHEN** a `participant:status-changed` event arrives for that red side member with `checkInStatus: 'present'` and `weighInStatus: 'passed'`
- **THEN** within one Socket.IO round-trip the red side badge SHALL transition to `✅ 已檢錄`

#### Scenario: Bye match omits badge for empty blue side

- **WHEN** a ne-waza match has `isBye: true` and `bluePlayer.name === ''`
- **THEN** no eligibility badge SHALL be rendered on the blue side


<!-- @trace
source: check-in-and-weigh-in-system
updated: 2026-06-24
code:
  - frontend/src/app/features/check-in/check-in.component.ts
  - frontend/src/app/features/contact-audience/contact-audience.component.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - frontend/src/app/features/fighting-audience/fighting-audience.component.ts
  - frontend/src/app/shared/participant-badge.component.ts
  - backend/src/controllers/creativeRankingsController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - backend/src/controllers/teamController.ts
  - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
  - backend/src/models/Team.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - TESTING.md
  - frontend/tsconfig.spec.json
  - backend/src/index.ts
  - frontend/jest.config.js
  - backend/package.json
  - backend/src/controllers/checkInController.ts
  - frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.ts
  - frontend/src/app/app.routes.ts
  - frontend/package.json
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - frontend/src/app/features/login/login.component.ts
  - backend/src/controllers/eventController.ts
  - backend/src/seeds/initialUsers.ts
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/controllers/creativeTimerController.ts
  - backend/src/utils/forfeitPropagation.ts
  - frontend/src/app/features/check-in/check-in.component.html
  - frontend/src/app/features/contact-referee/contact-referee.component.ts
  - backend/src/controllers/matchScoreController.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - backend/src/models/User.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/setup-jest.ts
  - backend/src/routes/checkIn.ts
  - frontend/src/app/features/admin/judge-management/judge-management.component.ts
  - frontend/src/app/features/contact-referee/contact-referee.component.html
  - frontend/src/app/features/fighting-referee/fighting-referee.component.html
  - frontend/tsconfig.json
  - backend/src/seeds/migrateMembersToObjects.ts
  - backend/jest.config.js
  - frontend/src/app/core/utils/match-grouping.ts
  - backend/src/controllers/creativeFlowController.ts
tests:
  - frontend/src/app/core/utils/match-grouping.spec.ts
  - frontend/src/app/shared/participant-badge.component.spec.ts
  - backend/src/utils/__tests__/scoring.test.ts
  - backend/src/utils/__tests__/forfeitPropagation.test.ts
  - backend/src/models/__tests__/Team.test.ts
-->

---
### Requirement: Member ineligibility triggers automatic match forfeit and propagation

When a Team member transitions to `weighInStatus: 'failed'` or `checkInStatus: 'absent'` via the participant management endpoints, the backend SHALL automatically:

1. Locate every Match document in the same event with `status: 'pending'` that lists this member as `redPlayer` (matched by `name` AND `teamName`) or `bluePlayer`.
2. Update each such match to `isBye: true`, `result: { winner: <opposite side>, method: 'dq' }`, `status: 'completed'`.
3. Invoke the existing `updateMatchPropagation` helper for each newly completed match so any downstream match referencing it via `redSource.fromMatchNo` or `blueSource.fromMatchNo` advances the new winner.
4. Emit a single `match:forfeit-applied` Socket.IO event to the event room with payload `{ forfeitedMatchIds: string[], propagatedMatchIds: string[], reason: 'weigh-in-failed' | 'check-in-absent' }`.

Matches with `status: 'in-progress'` SHALL NOT be auto-modified; the participant endpoint response SHALL include a `skippedMatchIds` field listing them so the operator is informed.

#### Scenario: Failed weigh-in forfeits multiple pending matches

- **GIVEN** event E with two pending matches M1 (`redPlayer: A`, `bluePlayer: B`) and M2 (`bluePlayer: A`, `redPlayer: C`)
- **WHEN** member A is marked `weighInStatus: 'failed'`
- **THEN** M1 SHALL be updated to `{ isBye: true, status: 'completed', result: { winner: 'blue', method: 'dq' } }`
- **AND** M2 SHALL be updated to `{ isBye: true, status: 'completed', result: { winner: 'red', method: 'dq' } }`
- **AND** the broadcast `match:forfeit-applied` SHALL list both `M1._id` and `M2._id` in `forfeitedMatchIds`

#### Scenario: Forfeit propagation advances bracket

- **GIVEN** M1 (`redPlayer: A`, status pending) and M3 (`redSource.fromMatchNo: M1.matchNo`, status pending)
- **WHEN** member A is marked absent at check-in
- **THEN** M1 SHALL be forfeited (blue wins)
- **AND** M3's `redPlayer` SHALL be replaced by M1's blue side via `updateMatchPropagation`
- **AND** `match:forfeit-applied` SHALL include M1 in `forfeitedMatchIds` AND M3 in `propagatedMatchIds`

#### Scenario: In-progress match is reported as skipped

- **GIVEN** member A is participating in one pending match M1 and one in-progress match M2
- **WHEN** member A is marked absent
- **THEN** M1 SHALL be forfeited
- **AND** M2 SHALL remain `status: 'in-progress'` with no modification
- **AND** the controller response SHALL include `skippedMatchIds: [M2._id]`

<!-- @trace
source: check-in-and-weigh-in-system
updated: 2026-06-24
code:
  - frontend/src/app/features/check-in/check-in.component.ts
  - frontend/src/app/features/contact-audience/contact-audience.component.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - frontend/src/app/features/fighting-audience/fighting-audience.component.ts
  - frontend/src/app/shared/participant-badge.component.ts
  - backend/src/controllers/creativeRankingsController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - backend/src/controllers/teamController.ts
  - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
  - backend/src/models/Team.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - TESTING.md
  - frontend/tsconfig.spec.json
  - backend/src/index.ts
  - frontend/jest.config.js
  - backend/package.json
  - backend/src/controllers/checkInController.ts
  - frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.ts
  - frontend/src/app/app.routes.ts
  - frontend/package.json
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - frontend/src/app/features/login/login.component.ts
  - backend/src/controllers/eventController.ts
  - backend/src/seeds/initialUsers.ts
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/controllers/creativeTimerController.ts
  - backend/src/utils/forfeitPropagation.ts
  - frontend/src/app/features/check-in/check-in.component.html
  - frontend/src/app/features/contact-referee/contact-referee.component.ts
  - backend/src/controllers/matchScoreController.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - backend/src/models/User.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/setup-jest.ts
  - backend/src/routes/checkIn.ts
  - frontend/src/app/features/admin/judge-management/judge-management.component.ts
  - frontend/src/app/features/contact-referee/contact-referee.component.html
  - frontend/src/app/features/fighting-referee/fighting-referee.component.html
  - frontend/tsconfig.json
  - backend/src/seeds/migrateMembersToObjects.ts
  - backend/jest.config.js
  - frontend/src/app/core/utils/match-grouping.ts
  - backend/src/controllers/creativeFlowController.ts
tests:
  - frontend/src/app/core/utils/match-grouping.spec.ts
  - frontend/src/app/shared/participant-badge.component.spec.ts
  - backend/src/utils/__tests__/scoring.test.ts
  - backend/src/utils/__tests__/forfeitPropagation.test.ts
  - backend/src/models/__tests__/Team.test.ts
-->

---
### Requirement: Ne-Waza referee returns to match list view after completing a bye match

After the ne-waza-referee component's `completeByeMatch` flow successfully PATCHes a bye match (`isBye === true`, `bluePlayer.name === ''`) to `status: 'completed'` and emits `match:ended`, the referee interface SHALL return to the match list view and clear the active match selection, mirroring the post-success behaviour of the standard `endMatch` flow.

Specifically, in the SweetAlert success callback chained after the API call, the component SHALL set its `view` signal to `"list"` and SHALL clear `activeMatch` to `null`. This SHALL happen unconditionally on success and SHALL NOT depend on the user dismissing the success dialog through a particular action.

#### Scenario: Bye match completion returns to list

- **WHEN** the ne-waza referee opens a match with `isBye === true` and `bluePlayer.name === ''` and triggers `completeByeMatch`
- **AND** the backend PATCH succeeds and the SweetAlert success dialog is dismissed
- **THEN** the referee component SHALL switch its `view` signal to `"list"`
- **AND** SHALL clear `activeMatch` so the match list is rendered

#### Scenario: Bye completion failure stays on the match detail view

- **WHEN** the backend PATCH for a bye match completion returns a non-success status
- **THEN** the SweetAlert error dialog SHALL be shown
- **AND** the component SHALL remain on the bye match detail view (`view !== "list"`) so the referee can retry without re-navigating

<!-- @trace
source: match-list-completion-ux
updated: 2026-06-24
code:
  - backend/src/sockets/index.ts
  - backend/src/controllers/creativeRankingsController.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/contact-audience/contact-audience.component.ts
  - backend/src/controllers/matchScoreController.ts
  - frontend/setup-jest.ts
  - backend/src/controllers/eventController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - frontend/tsconfig.spec.json
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - backend/jest.config.js
  - frontend/src/app/features/contact-referee/contact-referee.component.html
  - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
  - backend/src/controllers/checkInController.ts
  - backend/src/models/User.ts
  - frontend/src/app/features/contact-referee/contact-referee.component.ts
  - backend/src/routes/checkIn.ts
  - backend/src/seeds/migrateMembersToObjects.ts
  - frontend/src/app/features/fighting-audience/fighting-audience.component.ts
  - backend/src/utils/forfeitPropagation.ts
  - frontend/package.json
  - frontend/src/app/app.routes.ts
  - backend/package.json
  - frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.ts
  - frontend/src/app/features/check-in/check-in.component.ts
  - backend/src/index.ts
  - backend/src/controllers/creativeFlowController.ts
  - frontend/src/app/shared/participant-badge.component.ts
  - frontend/src/app/features/check-in/check-in.component.html
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/tsconfig.json
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/core/utils/match-grouping.ts
  - frontend/src/app/features/admin/judge-management/judge-management.component.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - frontend/src/app/core/services/auth.service.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - TESTING.md
  - backend/src/seeds/initialUsers.ts
  - frontend/src/app/features/fighting-referee/fighting-referee.component.html
  - backend/src/models/Team.ts
  - backend/src/controllers/creativeTimerController.ts
  - backend/src/controllers/teamController.ts
  - frontend/jest.config.js
tests:
  - frontend/src/app/core/utils/match-grouping.spec.ts
  - backend/src/utils/__tests__/forfeitPropagation.test.ts
  - backend/src/utils/__tests__/scoring.test.ts
  - backend/src/models/__tests__/Team.test.ts
  - frontend/src/app/shared/participant-badge.component.spec.ts
-->