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

#### Scenario: Confirm button saves duration and starts countdown

- **WHEN** the referee confirms the duration selection
- **THEN** the frontend SHALL PATCH the match duration AND upon HTTP 200 response SHALL start the countdown AND SHALL dismiss the modal

#### Scenario: API error blocks start

- **WHEN** the PATCH /duration call returns a non-200 status
- **THEN** the modal SHALL remain open AND a SweetAlert2 error toast SHALL be displayed AND the countdown SHALL NOT start

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