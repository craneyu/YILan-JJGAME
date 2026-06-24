# match-schedule-management Specification

## Purpose

TBD - created by archiving change 'admin-sport-selector'. Update Purpose after archive.

## Requirements

### Requirement: Match management page loads matches by sport type

The match management page at `/admin/matches/:matchType` SHALL read the `matchType` route parameter (one of `ne-waza`, `fighting`, `contact`) and display only matches of that type for the selected event.

#### Scenario: Admin opens match management for Ne-Waza

- **WHEN** admin navigates to `/admin/matches/ne-waza` and selects an event
- **THEN** the system SHALL call `GET /api/v1/events/:eventId/matches?matchType=ne-waza`
- **THEN** the page SHALL display only ne-waza matches grouped by `weightClass`

#### Scenario: No event selected

- **WHEN** admin has not selected an event
- **THEN** the page SHALL display an event selection dropdown and no match list


<!-- @trace
source: admin-sport-selector
updated: 2026-03-09
code:
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/models/User.ts
  - backend/src/index.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/routes/matchScores.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - backend/src/controllers/matchScoreController.ts
  - docker-compose.yml
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - backend/src/seeds/initialUsers.ts
  - backend/src/models/Match.ts
  - frontend/src/app/app.routes.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/login/login.component.html
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/models/match.model.ts
  - backend/src/models/MatchScoreLog.ts
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
-->

---
### Requirement: Match list is grouped by weight class

Matches SHALL be displayed grouped by `weightClass`, sorted by `scheduledOrder` within each group. Each group SHALL be expandable/collapsible.

#### Scenario: Matches grouped and sorted

- **WHEN** the match list loads
- **THEN** matches with the same `weightClass` SHALL appear in the same group
- **THEN** within each group, matches SHALL be ordered by `scheduledOrder` ascending


<!-- @trace
source: admin-sport-selector
updated: 2026-03-09
code:
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/models/User.ts
  - backend/src/index.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/routes/matchScores.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - backend/src/controllers/matchScoreController.ts
  - docker-compose.yml
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - backend/src/seeds/initialUsers.ts
  - backend/src/models/Match.ts
  - frontend/src/app/app.routes.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/login/login.component.html
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/models/match.model.ts
  - backend/src/models/MatchScoreLog.ts
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
-->

---
### Requirement: Admin can edit a pending match inline

Admin SHALL be able to edit `redPlayer.name`, `redPlayer.teamName`, `bluePlayer.name`, `bluePlayer.teamName`, and `scheduledOrder` for matches with `status !== 'completed'`. Editing SHALL be done inline in the table row. The system SHALL call `PATCH /api/v1/events/:eventId/matches/:matchId` on save.

#### Scenario: Admin edits a pending match

- **WHEN** admin clicks the edit button on a non-completed match row
- **THEN** the row SHALL transform into editable input fields
- **WHEN** admin clicks save
- **THEN** the system SHALL call `PATCH /api/v1/events/:eventId/matches/:matchId` with updated fields
- **THEN** the list SHALL refresh with updated data

#### Scenario: Completed match is locked

- **WHEN** a match has `status === 'completed'`
- **THEN** the edit and delete buttons SHALL be disabled
- **THEN** the row SHALL display a visual lock indicator


<!-- @trace
source: admin-sport-selector
updated: 2026-03-09
code:
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/models/User.ts
  - backend/src/index.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/routes/matchScores.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - backend/src/controllers/matchScoreController.ts
  - docker-compose.yml
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - backend/src/seeds/initialUsers.ts
  - backend/src/models/Match.ts
  - frontend/src/app/app.routes.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/login/login.component.html
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/models/match.model.ts
  - backend/src/models/MatchScoreLog.ts
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
-->

---
### Requirement: Admin can delete a single match

Admin SHALL be able to delete a single non-completed match. The system SHALL prompt for confirmation before deletion. The backend SHALL expose `DELETE /api/v1/events/:eventId/matches/:matchId` restricted to `admin` role.

#### Scenario: Admin deletes a match with confirmation

- **WHEN** admin clicks delete on a non-completed match
- **THEN** the system SHALL display a SweetAlert2 confirmation dialog
- **WHEN** admin confirms
- **THEN** the system SHALL call `DELETE /api/v1/events/:eventId/matches/:matchId`
- **THEN** the match SHALL be removed from the list

#### Scenario: Admin cancels deletion

- **WHEN** admin clicks cancel in the confirmation dialog
- **THEN** the match SHALL remain unchanged


<!-- @trace
source: admin-sport-selector
updated: 2026-03-09
code:
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/models/User.ts
  - backend/src/index.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/routes/matchScores.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - backend/src/controllers/matchScoreController.ts
  - docker-compose.yml
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - backend/src/seeds/initialUsers.ts
  - backend/src/models/Match.ts
  - frontend/src/app/app.routes.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/login/login.component.html
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/models/match.model.ts
  - backend/src/models/MatchScoreLog.ts
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
-->

---
### Requirement: Admin can clear all matches for a sport type

Admin SHALL be able to delete all matches of the current `matchType` for the selected event in a single action. The system SHALL prompt for confirmation. The backend SHALL expose `DELETE /api/v1/events/:eventId/matches?matchType=` restricted to `admin` role.

#### Scenario: Admin clears all matches of a type

- **WHEN** admin clicks "清空全部" and confirms
- **THEN** the system SHALL call `DELETE /api/v1/events/:eventId/matches?matchType=<current>`
- **THEN** the match list SHALL be empty

#### Scenario: Clear all with matchType filter

- **WHEN** `DELETE /api/v1/events/:eventId/matches` is called with `?matchType=ne-waza`
- **THEN** only matches with `matchType === 'ne-waza'` for that event SHALL be deleted
- **THEN** matches of other types SHALL remain unaffected


<!-- @trace
source: admin-sport-selector
updated: 2026-03-09
code:
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/models/User.ts
  - backend/src/index.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/routes/matchScores.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - backend/src/controllers/matchScoreController.ts
  - docker-compose.yml
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - backend/src/seeds/initialUsers.ts
  - backend/src/models/Match.ts
  - frontend/src/app/app.routes.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/login/login.component.html
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/models/match.model.ts
  - backend/src/models/MatchScoreLog.ts
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
-->

---
### Requirement: Backend exposes DELETE endpoints for matches

The backend SHALL provide two DELETE endpoints for match management, both restricted to `admin` role:

- `DELETE /api/v1/events/:eventId/matches/:matchId` — delete a single match
- `DELETE /api/v1/events/:eventId/matches` — delete all matches for an event, with optional `?matchType=` query filter

#### Scenario: Delete single match

- **WHEN** `DELETE /api/v1/events/:eventId/matches/:matchId` is called by admin
- **THEN** the match SHALL be permanently deleted from the database
- **THEN** the response SHALL return `{ success: true }`

#### Scenario: Delete single match not found

- **WHEN** `DELETE /api/v1/events/:eventId/matches/:matchId` is called with a non-existent ID
- **THEN** the response SHALL return HTTP 404 with `{ success: false, error: '找不到場次' }`

#### Scenario: Bulk delete with matchType filter

- **WHEN** `DELETE /api/v1/events/:eventId/matches?matchType=fighting` is called by admin
- **THEN** all matches with `matchType === 'fighting'` for that event SHALL be deleted
- **THEN** the response SHALL return `{ success: true, deleted: <count> }`

#### Scenario: Bulk delete without matchType filter

- **WHEN** `DELETE /api/v1/events/:eventId/matches` is called without `?matchType=`
- **THEN** all matches for that event SHALL be deleted
- **THEN** the response SHALL return `{ success: true, deleted: <count> }`

<!-- @trace
source: admin-sport-selector
updated: 2026-03-09
code:
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/models/User.ts
  - backend/src/index.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/routes/matchScores.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - backend/src/controllers/matchScoreController.ts
  - docker-compose.yml
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - backend/src/seeds/initialUsers.ts
  - backend/src/models/Match.ts
  - frontend/src/app/app.routes.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/login/login.component.html
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/models/match.model.ts
  - backend/src/models/MatchScoreLog.ts
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
-->

---
### Requirement: Match list shows placeholder for unresolved sourced players

For Match documents with `redSource` or `blueSource` set and `.resolved === false`, the match management list and the `ne-waza-referee` list SHALL render the corresponding side's player name as a placeholder of the form `"N 勝者"` (where N is `source.fromMatchNo`).

The placeholder text SHALL be visually distinguished using muted italic styling (Tailwind: `text-white/40 italic`) so the operator can distinguish unresolved placeholders from real player names.

When `.resolved === true`, the system SHALL render the actual `redPlayer.name` / `redPlayer.teamName` (or blue counterpart) without placeholder styling.

The placeholder rendering SHALL react to incoming `match:advancement-resolved` Socket.IO events by re-rendering the affected list row without requiring a manual reload.

#### Scenario: Unresolved sourced match shows placeholder

- **GIVEN** Match #16 has `redSource = { fromMatchNo: 3, resolved: false }`, `redPlayer.name = "3 勝者"`, `redPlayer.teamName = ""`, `bluePlayer.name = "許程睿"`, `bluePlayer.teamName = "大隱國小"`
- **WHEN** admin or referee views the match list
- **THEN** Match #16's red column SHALL display `"3 勝者"` in muted italic text
- **AND** Match #16's blue column SHALL display `"許程睿"` and `"大隱國小"` in normal styling

#### Scenario: Resolved placeholder switches to actual name

- **GIVEN** Match #16 currently shows red column as `"3 勝者"` placeholder
- **WHEN** the client receives a `match:advancement-resolved` event with `{ matchId: <#16 id>, side: "red", playerName: "陳冠茗", teamName: "Jabari", fromMatchNo: 3 }`
- **THEN** Match #16's red column SHALL re-render to show `"陳冠茗"` / `"Jabari"` in normal styling within the same view (no manual reload)

#### Scenario: Match without source renders normally

- **GIVEN** Match #5 has `redSource = undefined`, `blueSource = undefined`
- **WHEN** the match list renders Match #5
- **THEN** both player columns SHALL render normally with no placeholder styling

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
### Requirement: Admin match management displays winner and decision method for completed matches

The Admin match management page (`/admin/matches/:matchType`) SHALL display the winner side and decision method for any match whose `status === 'completed'`, in addition to the existing green "完成" status badge.

The winner side SHALL be rendered as a coloured badge: red wins SHALL use `bg-red-500/20 text-red-300`, blue wins SHALL use `bg-blue-500/20 text-blue-300`. The decision method SHALL be rendered next to the winner badge using the following mapping:

| `m.result.method` value | Display text (Traditional Chinese) |
| --- | --- |
| `judge` | 裁判判決 |
| `submission` | 降伏勝 |
| `dq` | 取消資格 |

If `m.result` is missing on a completed match, the page SHALL still render the "完成" badge but SHALL omit the winner and method labels.

#### Scenario: Completed match shows red winner

- **WHEN** the page renders a row with `status: 'completed'` and `result: { winner: 'red', method: 'judge' }`
- **THEN** the row SHALL display the green "完成" badge AND a red-tinted "紅方勝" badge AND the text "裁判判決"

#### Scenario: Completed match shows blue winner with submission

- **WHEN** the page renders a row with `status: 'completed'` and `result: { winner: 'blue', method: 'submission' }`
- **THEN** the row SHALL display the green "完成" badge AND a blue-tinted "藍方勝" badge AND the text "降伏勝"

#### Scenario: Completed match without result data

- **WHEN** the page renders a row with `status: 'completed'` but `result` is undefined or null
- **THEN** the row SHALL display only the green "完成" badge with no winner/method labels and SHALL NOT throw a runtime error


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

---
### Requirement: Admin match management subscribes to match completion events for live updates

The Admin match management page SHALL subscribe to the `match:ended` Socket.IO event for the current event room. When an event arrives whose `matchId` matches an entry in the currently loaded match list, the page SHALL update that entry in place by setting `status = 'completed'` and `result = { winner, method }` from the event payload, then SHALL re-apply ordering and visual styling without requiring a manual page refresh.

#### Scenario: Live update on referee finalization

- **WHEN** a referee finalizes a match and the backend emits `match:ended` with payload `{ matchId: 'X', winner: 'red', method: 'judge' }`
- **AND** the admin has the match management page open with match X visible in the list
- **THEN** within one Socket.IO round-trip the row for match X SHALL show the "完成" badge, the red winner badge, and the "裁判判決" label
- **AND** the list ordering SHALL re-flow so match X sinks below remaining pending matches in its weight class group

#### Scenario: Event for unrelated match is ignored

- **WHEN** a `match:ended` event arrives whose `matchId` is not present in the currently loaded list (for example a different sport type page is open)
- **THEN** the page state SHALL remain unchanged and SHALL NOT throw a runtime error

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