# participant-check-in Specification

## Purpose

TBD - created by archiving change 'check-in-and-weigh-in-system'. Update Purpose after archive.

## Requirements

### Requirement: New check_in_officer role authorized for participant management endpoints

The system SHALL define a new user role `check_in_officer`. JWTs with `role: 'check_in_officer'` SHALL be accepted by the following endpoints:

- `GET /api/v1/events/:eventId/participants`
- `PATCH /api/v1/events/:eventId/participants/:teamId/:memberIndex/weigh-in`
- `PATCH /api/v1/events/:eventId/participants/:teamId/:memberIndex/check-in`

The `admin` role SHALL also be accepted by these endpoints (admin is a superset of check_in_officer for participant management).

All other roles SHALL receive HTTP 403 on these endpoints.

#### Scenario: check_in_officer fetches participants

- **WHEN** a JWT with `role: 'check_in_officer'` sends `GET /api/v1/events/abc/participants`
- **THEN** the system SHALL respond HTTP 200 with the participant list

#### Scenario: scoring_judge denied participant access

- **WHEN** a JWT with `role: 'scoring_judge'` sends `PATCH /api/v1/events/abc/participants/t1/0/weigh-in`
- **THEN** the system SHALL respond HTTP 403


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
### Requirement: Team.members stores per-member weigh-in and check-in status

The `Team.members` field SHALL be persisted as an array of `IMember` objects rather than an array of strings. Each `IMember` SHALL contain:

| Field | Type | Constraint |
|---|---|---|
| `name` | String | required |
| `weighInStatus` | String enum | one of `pending`, `passed`, `failed`, `n/a`; default `pending` for fighting/ne-waza/contact participants, `n/a` for Duo/Show participants |
| `checkInStatus` | String enum | one of `pending`, `present`, `absent`; default `pending` |
| `weighInAt` | Date | optional; SHALL be set when `weighInStatus` transitions away from `pending` |
| `checkInAt` | Date | optional; SHALL be set when `checkInStatus` transitions away from `pending` |
| `disqualifyReason` | String | optional; SHALL be populated when status becomes `failed` or `absent` and a reason is provided by the operator |

A one-time migration script SHALL upgrade all existing `Team` documents whose `members` is an array of strings: each string is converted to `{ name, weighInStatus, checkInStatus, ...defaults }`, deriving `weighInStatus` from the team's `competitionType` (`'Duo' | 'Show'` → `n/a`; otherwise `pending`).

#### Scenario: New team default status

- **WHEN** a new Team document is created for a fighting event without explicit member status values
- **THEN** each member SHALL have `weighInStatus: 'pending'` and `checkInStatus: 'pending'`

#### Scenario: Duo team is exempt from weigh-in

- **WHEN** a new Team document is created with `competitionType: 'Duo'`
- **THEN** each member SHALL have `weighInStatus: 'n/a'` and `checkInStatus: 'pending'`

#### Scenario: Migration of existing string-member team

- **WHEN** the migration script runs against a Team document whose `members` is `["Alice", "Bob"]` and `competitionType: 'Duo'`
- **THEN** the document SHALL be updated to `members: [{ name: 'Alice', weighInStatus: 'n/a', checkInStatus: 'pending' }, { name: 'Bob', weighInStatus: 'n/a', checkInStatus: 'pending' }]`


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
### Requirement: Weigh-in tab shows only fighting, ne-waza, and contact participants

The check-in page (`/check-in`) SHALL render a "Weigh-in" tab that lists only members whose `weighInStatus !== 'n/a'`. Members from Duo / Show competition teams SHALL NOT appear in the weigh-in tab.

Each row in the weigh-in tab SHALL display: member name, team name, weight class (if available via team's tier), current `weighInStatus` badge, and two action buttons (`通過` and `失格`). Operators SHALL be able to provide an optional reason text when marking `失格`.

#### Scenario: Duo member hidden from weigh-in tab

- **WHEN** a Duo team's member is loaded and the operator opens the weigh-in tab
- **THEN** that member SHALL NOT appear in the weigh-in list

#### Scenario: Ne-waza member listed in weigh-in tab

- **WHEN** a ne-waza team's member with `weighInStatus: 'pending'` is loaded
- **THEN** the weigh-in tab SHALL render a row showing the member with status badge "待過磅" and action buttons "通過" / "失格"


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
### Requirement: Check-in tab lists all participants and disables operations on weigh-in-failed members

The check-in page SHALL render a "Check-in" tab that lists every member of every team in the event, regardless of competition type. Members whose `weighInStatus === 'failed'` SHALL be displayed in a dimmed visual style with the label "不需檢錄" and SHALL NOT expose the to-present / to-absent action buttons.

For all other members, two action buttons (`到場` and `未到`) SHALL be available. Operators SHALL be able to provide an optional reason text when marking `未到`.

#### Scenario: Weigh-in failed member is greyed out in check-in tab

- **WHEN** a member has `weighInStatus: 'failed'`
- **THEN** the check-in tab row SHALL render with dimmed styling (e.g., `bg-white/5 text-white/30 italic`) AND SHALL display the static label "不需檢錄"
- **AND** SHALL NOT show the `到場` or `未到` buttons

#### Scenario: Passed member is actionable in check-in tab

- **WHEN** a member has `weighInStatus: 'passed'` and `checkInStatus: 'pending'`
- **THEN** the check-in tab row SHALL render the `到場` and `未到` buttons enabled


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
### Requirement: Status transitions are persisted and broadcast in real time

Successful `PATCH /api/v1/events/:eventId/participants/:teamId/:memberIndex/weigh-in` and `.../check-in` requests SHALL:

1. Persist the new status and the corresponding timestamp (`weighInAt` or `checkInAt`) to `Team.members[memberIndex]`.
2. Emit a `participant:status-changed` Socket.IO event to the event room containing the updated status snapshot.

The broadcast payload SHALL match this shape:

```ts
{
  teamId: string;
  memberIndex: number;
  memberName: string;
  weighInStatus: 'pending' | 'passed' | 'failed' | 'n/a';
  checkInStatus: 'pending' | 'present' | 'absent';
  disqualifyReason?: string;
}
```

#### Scenario: Weigh-in pass triggers broadcast

- **WHEN** a check_in_officer PATCHes `weigh-in` with `{ status: 'passed' }` for team `t1` member index `0`
- **THEN** the system SHALL update that member's `weighInStatus` to `'passed'` and `weighInAt` to the current timestamp
- **AND** SHALL emit `participant:status-changed` to the event room with the updated payload


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
### Requirement: Disqualifying status changes are irreversible from check_in_officer role

Once a member's `weighInStatus` is set to `'failed'` or `checkInStatus` is set to `'absent'`, a subsequent PATCH from a `check_in_officer` JWT attempting to revert the status SHALL be rejected with HTTP 409 and an error message indicating the change is irreversible from this role.

Admin JWTs SHALL be permitted to override and revert any status (e.g., admin can manually correct a mistake).

#### Scenario: check_in_officer cannot revert failed weigh-in

- **WHEN** a member has `weighInStatus: 'failed'` and a check_in_officer PATCHes `weigh-in` with `{ status: 'passed' }`
- **THEN** the system SHALL respond HTTP 409 with error "狀態變更不可逆，請聯絡 admin"
- **AND** the stored status SHALL remain `failed`

#### Scenario: Admin can revert failed status

- **WHEN** a member has `weighInStatus: 'failed'` and an admin PATCHes `weigh-in` with `{ status: 'pending' }`
- **THEN** the system SHALL accept the change and update the status to `pending`


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
### Requirement: Forfeit propagation triggers when a member becomes ineligible

When a successful PATCH transitions a member's `weighInStatus` to `'failed'` or `checkInStatus` to `'absent'`, the system SHALL invoke `applyMemberForfeit(eventId, teamName, memberName, reason)` which performs the following atomic flow:

1. Identify all Match documents in the same event with `status: 'pending'` where either `redPlayer === {name, teamName}` or `bluePlayer === {name, teamName}`.
2. For each such match, set `isBye: true`, `result: { winner: <opposite side>, method: 'dq' }`, `status: 'completed'`.
3. For each newly completed match, invoke the existing `updateMatchPropagation(match)` utility to advance the winner into any downstream match that referenced this match via `redSource.fromMatchNo` or `blueSource.fromMatchNo`.
4. Emit `match:forfeit-applied` Socket.IO event to the event room with `{ forfeitedMatchIds, propagatedMatchIds, reason }`.

If no pending match references the member, the helper SHALL be a no-op (no broadcast, no error).

Matches with `status: 'in-progress'` or `status: 'completed'` SHALL NOT be modified by this helper; the operator SHALL be informed via the controller response that those matches were skipped.

#### Scenario: Failed weigh-in forfeits one pending match

- **GIVEN** event E with one pending fighting match M where `redPlayer = {name: 'A', teamName: 'TeamX'}` and `bluePlayer = {name: 'B', teamName: 'TeamY'}`
- **WHEN** check_in_officer PATCHes `weigh-in` to mark member A as failed
- **THEN** match M SHALL be updated to `{ isBye: true, status: 'completed', result: { winner: 'blue', method: 'dq' } }`
- **AND** the system SHALL emit `match:forfeit-applied` with `forfeitedMatchIds: [M._id]`

#### Scenario: Forfeit propagates to downstream sourced match

- **GIVEN** match M1 has `redPlayer = {name: 'A'}` and `status: pending`, and match M2 has `redSource.fromMatchNo === M1.matchNo`
- **WHEN** member A is marked weigh-in failed
- **THEN** M1 SHALL be forfeited with blue side winning
- **AND** M2's `redPlayer.name` and `redPlayer.teamName` SHALL be updated to M1's blue side via `updateMatchPropagation`
- **AND** the broadcast `match:forfeit-applied` SHALL include both M1 in `forfeitedMatchIds` and M2 in `propagatedMatchIds`

#### Scenario: In-progress match is not auto-forfeited

- **WHEN** a member is marked absent while one of their matches is `status: 'in-progress'`
- **THEN** that in-progress match SHALL NOT be modified
- **AND** the controller response SHALL include a `skippedMatchIds` list naming that match


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
### Requirement: Team-level check-in status for Duo/Show is derived from member status

The `GET /api/v1/events/:eventId/participants` response SHALL include for every team a `teamCheckedIn: boolean` field that is derived (not persisted) as:

```
teamCheckedIn === team.members.every(m => m.checkInStatus === 'present')
```

For Duo / Show competition teams, this derived value SHALL be the canonical "team-level check-in completion" state used by audience and referee displays.

#### Scenario: Duo team with one absent member

- **WHEN** a Duo team has members `[{checkInStatus: 'present'}, {checkInStatus: 'absent'}]`
- **THEN** the response SHALL set `teamCheckedIn: false`

#### Scenario: All members present

- **WHEN** every member of a team has `checkInStatus: 'present'`
- **THEN** the response SHALL set `teamCheckedIn: true`

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