# referee-judge-decision-flow Specification

## Purpose

TBD - created by archiving change 'referee-scoring-fixes'. Update Purpose after archive.

## Requirements

### Requirement: Referee judge decision two-phase flow

The referee interface SHALL separate the judge decision into two distinct phases: winner announcement and match finalization.

Phase 1 (Announcement): The referee taps "Red Wins" or "Blue Wins" to broadcast the winner to the audience display without writing the result to the database.

Phase 2 (Finalization): The referee taps either "End Match" or "Next Match" to finalize the result in the database and emit `match:ended`.

#### Scenario: Referee announces winner

- **WHEN** referee taps the "Red Wins" or "Blue Wins" button
- **THEN** the match timer SHALL pause
- **THEN** a `match:winner-preview` socket event SHALL be broadcast to the event room with `{ matchId, winner: 'red' | 'blue' }`
- **THEN** the "Red Wins" and "Blue Wins" buttons SHALL be hidden
- **THEN** "End Match" and "Next Match" buttons SHALL appear

#### Scenario: Audience receives winner preview

- **WHEN** a `match:winner-preview` event is received on the audience display
- **THEN** the winner banner SHALL be displayed immediately
- **THEN** the losing player row SHALL dim (reduced opacity)

#### Scenario: Referee ends match

- **WHEN** referee taps the "End Match" button after announcing a winner
- **THEN** the system SHALL PATCH the match status to `completed` in the database
- **THEN** the system SHALL broadcast `match:ended` to the event room
- **THEN** a completion dialog SHALL be shown to the referee
- **THEN** the referee SHALL remain on the scoring view

#### Scenario: Referee moves to next match

- **WHEN** referee taps the "Next Match" button after announcing a winner
- **THEN** the system SHALL PATCH the match status to `completed` in the database
- **THEN** the system SHALL broadcast `match:ended` to the event room
- **THEN** the referee view SHALL return to the match list silently (no dialog)


<!-- @trace
source: referee-ui-improvements
updated: 2026-03-09
code:
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - frontend/src/app/core/models/match.model.ts
  - backend/src/routes/creativeFlow.ts
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/seeds/initialUsers.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.html
  - backend/src/index.ts
  - backend/src/controllers/matchScoreController.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - backend/src/models/Match.ts
  - backend/src/models/User.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - backend/src/routes/matchScores.ts
  - frontend/src/app/features/login/login.component.html
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - backend/src/routes/matches.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/sockets/index.ts
  - docker-compose.yml
  - frontend/src/app/app.routes.ts
-->

---
### Requirement: Winner preview socket event

The system SHALL emit a `match:winner-preview` socket event when the referee announces a winner, before match finalization.

The event payload SHALL contain `{ matchId: string, winner: 'red' | 'blue' }`.

#### Scenario: Winner preview broadcast

- **WHEN** referee emits `match:emit-winner-preview` with a valid matchId and winner
- **THEN** the backend SHALL broadcast `match:winner-preview` to all clients in the eventId room

<!-- @trace
source: referee-ui-improvements
updated: 2026-03-09
code:
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - frontend/src/app/core/models/match.model.ts
  - backend/src/routes/creativeFlow.ts
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/seeds/initialUsers.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.html
  - backend/src/index.ts
  - backend/src/controllers/matchScoreController.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - backend/src/models/Match.ts
  - backend/src/models/User.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - backend/src/routes/matchScores.ts
  - frontend/src/app/features/login/login.component.html
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - backend/src/routes/matches.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/sockets/index.ts
  - docker-compose.yml
  - frontend/src/app/app.routes.ts
-->

---
### Requirement: FULL IPPON triggers pending state requiring referee confirmation

When a FULL IPPON condition is detected (all three PART IPPON counts >= 1), the system SHALL set Match status to `full-ippon-pending` and pause the timer and emit `match:full-ippon`. The referee interface SHALL highlight the [Red Wins] / [Blue Wins] buttons and SHALL NOT auto-finalize the match.

#### Scenario: FULL IPPON pending displayed on referee screen

- **WHEN** the referee interface receives `match:full-ippon`
- **THEN** the timer SHALL pause AND a FULL IPPON alert banner SHALL appear AND the [Red Wins] and [Blue Wins] buttons SHALL remain visible and be highlighted for confirmation

#### Scenario: Referee confirms winner after FULL IPPON

- **WHEN** Match is in `full-ippon-pending` status and referee presses [Red Wins]
- **THEN** the match SHALL be finalized with `winner: 'red'` and `method: 'full-ippon'`


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
### Requirement: SHIDO DQ triggers pending state requiring referee confirmation

When SHIDO DQ alert is received (`match:shido-dq`), the referee interface SHALL display a DQ alert banner and pause the timer. The referee SHALL still press [Red Wins] / [Blue Wins] to complete the judgment.

#### Scenario: SHIDO DQ pending displayed on referee screen

- **WHEN** the referee interface receives `match:shido-dq` with `{ suggestedDisqualified, suggestedWinner }`
- **THEN** the timer SHALL pause AND a DQ alert banner SHALL show the disqualified player's SHIDO count AND [Red Wins] and [Blue Wins] buttons SHALL remain visible for final confirmation

#### Scenario: Referee confirms winner after SHIDO DQ alert

- **WHEN** Match is in `shido-dq-pending` status and referee presses [Blue Wins]
- **THEN** the match SHALL be finalized with `winner: 'blue'` and `method: 'shido-dq'`

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