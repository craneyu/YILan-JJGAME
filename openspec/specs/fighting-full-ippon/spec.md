# fighting-full-ippon Specification

## Purpose

TBD - created by archiving change 'fighting-v6-advanced-scoring'. Update Purpose after archive.

## Requirements

### Requirement: FULL IPPON detection on backend

After each PART score action, the backend controller SHALL check the player's current IPPON snapshot. If all three PART IPPON counts are ≥ 1 (p1 ≥ 1 AND p2 ≥ 1 AND p3 ≥ 1), the system SHALL trigger FULL IPPON pending state. The match SHALL NOT be auto-finalized; the referee must still confirm.

#### Scenario: All three PART IPPONs achieved

- **WHEN** a referee scores a PART button action that results in p1 ≥ 1, p2 ≥ 1, and p3 ≥ 1 for a player
- **THEN** the backend SHALL set Match status to `full-ippon-pending` AND pause the timer AND emit `match:full-ippon` with `{ matchId, suggestedWinner }` AND set that player's totalScore to 50 AND set the opponent's totalScore to 0

#### Scenario: Not all three PART IPPONs reached

- **WHEN** a referee scores a PART button action but fewer than three PART IPPON counts are ≥ 1
- **THEN** the system SHALL NOT trigger FULL IPPON and the match SHALL continue normally


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
### Requirement: FULL IPPON Socket broadcast

Upon FULL IPPON detection, the backend SHALL emit a `match:full-ippon` Socket.IO event to all clients in the match room.

#### Scenario: Broadcast payload

- **WHEN** FULL IPPON is triggered
- **THEN** the server SHALL broadcast `match:full-ippon` with payload `{ matchId, winner: 'red' | 'blue', winnerName: string }` to the match room


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
### Requirement: Audience display FULL IPPON overlay

Upon receiving `match:full-ippon`, the audience display SHALL show a full-screen overlay with the text "FULL IPPON" and the suggested winner's name. The overlay SHALL remain until the match is officially finalized.

#### Scenario: Overlay appears on audience screen

- **WHEN** the audience component receives the `match:full-ippon` Socket event
- **THEN** a full-screen overlay SHALL appear displaying "FULL IPPON" in large text and the suggested winning player's name

#### Scenario: Overlay dismissed on match finalized

- **WHEN** `match:ended` event is received (referee confirmed winner)
- **THEN** the FULL IPPON overlay SHALL be dismissed


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
### Requirement: Finished match rejects further score actions

A match with status `finished` SHALL reject any additional scoring API calls.

#### Scenario: Score action on finished match

- **WHEN** a referee submits a score action for a match that already has status `finished`
- **THEN** the API SHALL return HTTP 409 Conflict and no score log SHALL be created

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