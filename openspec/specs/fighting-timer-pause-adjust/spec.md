# fighting-timer-pause-adjust Specification

## Purpose

TBD - created by archiving change 'fighting-v6-advanced-scoring'. Update Purpose after archive.

## Requirements

### Requirement: Timer adjustment panel shown when paused

When the match countdown is paused, the referee interface SHALL display a time adjustment panel with increment/decrement buttons.

#### Scenario: Adjustment panel appears on pause

- **WHEN** the referee pauses the match countdown
- **THEN** the timer adjustment panel SHALL appear showing current remaining time and six adjustment buttons: +1s, -1s, +10s, -10s, +1min, -1min

#### Scenario: Adjustment panel hidden when running

- **WHEN** the match countdown is running
- **THEN** the timer adjustment panel SHALL NOT be visible


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
### Requirement: Time adjustment buttons modify displayed remaining time

Each adjustment button SHALL update the displayed remaining time immediately in the UI without calling any API. The adjustment SHALL be local until the referee confirms.

#### Scenario: +1 min adjustment

- **WHEN** the referee clicks +1min button while paused
- **THEN** the displayed remaining time SHALL increase by 60 seconds

#### Scenario: -1s cannot go below zero

- **WHEN** the referee clicks -1s and the remaining time is 0
- **THEN** the remaining time SHALL stay at 0


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
### Requirement: Resume without save ignores adjustments

The "繼續比賽" (Resume) button SHALL resume the countdown from the original remaining time before any adjustments were made in this pause session.

#### Scenario: Resume discards adjustments

- **WHEN** the referee adjusts time then clicks "繼續比賽"
- **THEN** the countdown SHALL resume from the pre-adjustment remaining time AND no API call SHALL be made for the adjustment


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
### Requirement: Save and resume applies adjustments and logs

The "儲存並繼續" (Save & Resume) button SHALL call `PATCH /api/v1/matches/:id/timer-adjust` with `{ remainingBefore: number, remainingAfter: number }` and then resume the countdown from the new time.

#### Scenario: Save and resume logs the adjustment

- **WHEN** the referee clicks "儲存並繼續"
- **THEN** the frontend SHALL POST the timer-adjust log AND upon HTTP 200 SHALL resume countdown from the adjusted remaining time

#### Scenario: Timer adjust log persisted in MatchScoreLog

- **WHEN** a timer-adjust API call succeeds
- **THEN** a `MatchScoreLog` document SHALL be created with `actionType: 'timer-adjust'`, `remainingBefore`, and `remainingAfter` fields

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