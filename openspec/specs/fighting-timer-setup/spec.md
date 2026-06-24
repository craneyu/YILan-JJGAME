# fighting-timer-setup Specification

## Purpose

TBD - created by archiving change 'fighting-v6-advanced-scoring'. Update Purpose after archive.

## Requirements

### Requirement: Match duration stored in Match model

The Match model SHALL include a `matchDuration` field (Number, seconds, default: 180) to persist the selected duration.

#### Scenario: Default duration is 180 seconds

- **WHEN** a new Match document is created without specifying `matchDuration`
- **THEN** `matchDuration` SHALL default to 180


<!-- @trace
source: fighting-v6-advanced-scoring
updated: 2026-03-11
code:
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/models/Match.ts
  - backend/src/controllers/matchController.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/core/models/match.model.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - backend/src/controllers/matchScoreController.ts
  - backend/src/routes/matchScores.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/features/match-referee/match-referee.component.html
  - SPEC/SPEC-v6.md
-->

---
### Requirement: Timer setup modal shown before match start

When a match is loaded and its status is `pending`, the referee interface SHALL display a timer setup modal before allowing any scoring actions.

#### Scenario: Modal displayed on match load in pending state

- **WHEN** the referee navigates to a match with status `pending`
- **THEN** a modal SHALL be shown with quick-select buttons for 2 minutes (120 s) and 3 minutes (180 s) and a confirm button

#### Scenario: Quick-select 2 min

- **WHEN** the referee clicks the 2-minute quick-select button
- **THEN** the duration input SHALL be set to 120 seconds

#### Scenario: Quick-select 3 min

- **WHEN** the referee clicks the 3-minute quick-select button
- **THEN** the duration input SHALL be set to 180 seconds


<!-- @trace
source: fighting-v6-advanced-scoring
updated: 2026-03-11
code:
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/models/Match.ts
  - backend/src/controllers/matchController.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/core/models/match.model.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - backend/src/controllers/matchScoreController.ts
  - backend/src/routes/matchScores.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/features/match-referee/match-referee.component.html
  - SPEC/SPEC-v6.md
-->

---
### Requirement: Duration confirmed via API before countdown starts

The referee interface SHALL call `PATCH /api/v1/matches/:id/duration` with `{ duration: number }` when the confirm button is clicked. The countdown SHALL NOT start until the API responds with HTTP 200.

Upon successful persistence of the new duration, the backend SHALL broadcast a `match:timer-updated` Socket.IO event to the event room so audience displays immediately reflect the newly set duration without waiting for the countdown to start. The broadcast SHALL include `matchId`, `remaining` equal to the persisted duration in seconds, `paused: true`, and `durationSec` equal to the persisted duration. This broadcast SHALL fire on both initial duration setup and subsequent duration changes (for example, when overtime is configured after a draw).

#### Scenario: Confirm button saves duration and starts countdown

- **WHEN** the referee confirms the duration selection
- **THEN** the frontend SHALL PATCH the match duration AND upon HTTP 200 response SHALL start the countdown AND SHALL dismiss the modal

#### Scenario: API error blocks start

- **WHEN** the PATCH /duration call returns a non-200 status
- **THEN** the modal SHALL remain open AND a SweetAlert2 error toast SHALL be displayed AND the countdown SHALL NOT start

#### Scenario: Duration broadcast on initial setup

- **WHEN** the referee confirms a duration of 180 seconds for a pending match and the backend persists it successfully
- **THEN** the backend SHALL emit `match:timer-updated` to the event room with payload `{ matchId, remaining: 180, paused: true, durationSec: 180 }`
- **AND** the audience display SHALL show `03:00` before the countdown starts

#### Scenario: Duration broadcast on overtime configuration

- **WHEN** the referee sets a new duration of 120 seconds for a match that previously had 180 seconds (for example, configuring an overtime round after a draw)
- **THEN** the backend SHALL emit `match:timer-updated` to the event room with payload `{ matchId, remaining: 120, paused: true, durationSec: 120 }`
- **AND** the audience display SHALL immediately show `02:00` without waiting for the countdown to start

<!-- @trace
source: match-timer-broadcast-fix
updated: 2026-06-24
code:
  - frontend/src/app/core/utils/match-grouping.ts
  - frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - frontend/package.json
  - frontend/src/app/features/check-in/check-in.component.html
  - frontend/jest.config.js
  - frontend/tsconfig.spec.json
  - backend/src/sockets/index.ts
  - frontend/src/app/app.routes.ts
  - frontend/setup-jest.ts
  - frontend/src/app/features/admin/judge-management/judge-management.component.ts
  - backend/jest.config.js
  - backend/src/models/User.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - backend/src/controllers/creativeRankingsController.ts
  - TESTING.md
  - backend/src/models/Team.ts
  - backend/src/seeds/migrateMembersToObjects.ts
  - frontend/src/app/shared/participant-badge.component.ts
  - frontend/tsconfig.json
  - backend/src/utils/forfeitPropagation.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/features/contact-referee/contact-referee.component.ts
  - frontend/src/app/features/fighting-audience/fighting-audience.component.ts
  - backend/src/routes/checkIn.ts
  - backend/src/controllers/checkInController.ts
  - backend/src/controllers/matchScoreController.ts
  - frontend/src/app/features/contact-referee/contact-referee.component.html
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - backend/src/index.ts
  - backend/src/controllers/eventController.ts
  - backend/src/seeds/initialUsers.ts
  - frontend/src/app/features/check-in/check-in.component.ts
  - backend/src/controllers/creativeTimerController.ts
  - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
  - backend/src/controllers/creativeFlowController.ts
  - frontend/src/app/features/contact-audience/contact-audience.component.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - frontend/src/app/core/services/auth.service.ts
  - frontend/src/app/features/fighting-referee/fighting-referee.component.html
  - backend/src/controllers/teamController.ts
  - frontend/src/app/features/login/login.component.ts
  - backend/package.json
tests:
  - backend/src/utils/__tests__/forfeitPropagation.test.ts
  - frontend/src/app/core/utils/match-grouping.spec.ts
  - frontend/src/app/shared/participant-badge.component.spec.ts
  - backend/src/models/__tests__/Team.test.ts
  - backend/src/utils/__tests__/scoring.test.ts
-->