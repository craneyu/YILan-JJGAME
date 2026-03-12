# fighting-chui-dq Specification

## Purpose

TBD - created by archiving change 'fighting-v6-advanced-scoring'. Update Purpose after archive.

## Requirements

### Requirement: SHIDO count stored in Match model

The Match model SHALL include `redShido: number` (default: 0) and `blueShido: number` (default: 0). CHUI SHALL be converted to SHIDO units (+3 per CHUI) rather than tracked in a separate counter.

#### Scenario: Match initialized with zero SHIDO

- **WHEN** a new Match document is created
- **THEN** `redShido` and `blueShido` SHALL both default to 0


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
### Requirement: SHIDO foul assigns opponent score and WAZA-ARI

When +SHIDO is applied to a player, the system SHALL increment that player's SHIDO count by 1 AND add 1 to the opponent's total score AND add 1 to the opponent's WAZA-ARI count.

#### Scenario: +SHIDO applied to red player

- **WHEN** referee submits `+SHIDO` for the red player
- **THEN** `redShido` SHALL increase by 1 AND `blueScore` SHALL increase by 1 AND `blueWazaAri` SHALL increase by 1

#### Scenario: -SHIDO reverses opponent assignment when count is positive

- **WHEN** referee submits `-SHIDO` for the red player and `redShido` > 0
- **THEN** `redShido` SHALL decrease by 1 AND `blueScore` SHALL decrease by 1 AND `blueWazaAri` SHALL decrease by 1 (minimum 0)

#### Scenario: -SHIDO blocked when count is zero

- **WHEN** referee submits `-SHIDO` for a player whose SHIDO count is 0
- **THEN** the API SHALL return HTTP 400 and no changes SHALL be made


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
### Requirement: CHUI foul converts to three SHIDO units

When +CHUI is applied to a player, the system SHALL increment that player's SHIDO count by 3 AND add 3 to the opponent's total score AND add 3 to the opponent's WAZA-ARI count.

#### Scenario: +CHUI applied to blue player

- **WHEN** referee submits `+CHUI` for the blue player
- **THEN** `blueShido` SHALL increase by 3 AND `redScore` SHALL increase by 3 AND `redWazaAri` SHALL increase by 3

#### Scenario: -CHUI reverses three SHIDO units when sufficient count exists

- **WHEN** referee submits `-CHUI` for a player whose SHIDO count >= 3
- **THEN** `blueShido` SHALL decrease by 3 AND `redScore` SHALL decrease by 3 AND `redWazaAri` SHALL decrease by 3

#### Scenario: -CHUI blocked when insufficient SHIDO to reverse

- **WHEN** referee submits `-CHUI` for a player whose SHIDO count < 3
- **THEN** the API SHALL return HTTP 400 and no changes SHALL be made


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
### Requirement: SHIDO DQ alert when count reaches six

After any SHIDO or CHUI update, if a player's SHIDO count reaches 6 or more, the system SHALL set the Match to `shido-dq-pending` status AND pause the timer AND emit `match:shido-dq` with `{ matchId, suggestedDisqualified, suggestedWinner }`. The referee SHALL still be required to confirm by pressing [Red Wins] or [Blue Wins].

#### Scenario: SHIDO accumulation reaches six

- **WHEN** a player's SHIDO count reaches 6 or more
- **THEN** Match status SHALL become `shido-dq-pending` AND timer SHALL pause AND `match:shido-dq` SHALL be broadcast

#### Scenario: CHUI pushes SHIDO to six

- **WHEN** a player has `shidoCount = 3` and +CHUI is applied (adding 3)
- **THEN** SHIDO count becomes 6 AND `match:shido-dq` SHALL be emitted immediately

#### Scenario: Referee still confirms winner after SHIDO DQ alert

- **WHEN** Match is in `shido-dq-pending` status
- **THEN** the referee interface SHALL display [Red Wins] and [Blue Wins] buttons (highlighted) AND pressing one SHALL finalize the match

#### Scenario: Foul update rejected for finished match

- **WHEN** a SHIDO or CHUI update is submitted for a match with status `finished`
- **THEN** the API SHALL return HTTP 409 Conflict


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
### Requirement: SHIDO and CHUI badges on referee and audience screens

The referee interface and the audience display SHALL show the current SHIDO count for each player. A CHUI badge SHALL appear when a CHUI event has contributed to the SHIDO count.

#### Scenario: SHIDO badge visible at count 1 or more

- **WHEN** a player's SHIDO count is >= 1
- **THEN** a SHIDO badge with the numeric count SHALL appear on both referee and audience screens for that player

#### Scenario: CHUI badge shown after CHUI event

- **WHEN** a +CHUI action has been applied to a player
- **THEN** a CHUI indicator SHALL appear alongside the SHIDO count on both referee and audience screens


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
### Requirement: Deduction prevents negative scores

When any score reduction is applied (PART decrement, ALL PARTS decrement, SHIDO reversal), the system SHALL validate that the resulting score, WAZA-ARI count, and PART score are each >= 0. Operations that would produce a negative value SHALL be rejected.

#### Scenario: PART score decrement blocked at zero

- **WHEN** referee attempts to apply -2 to a PART with a current score of 0
- **THEN** the API SHALL return HTTP 400 and no changes SHALL be made

#### Scenario: Total score decrement blocked at zero

- **WHEN** referee attempts to apply -1 (ALL PARTS) when total score is 0
- **THEN** the API SHALL return HTTP 400 and no changes SHALL be made

#### Scenario: WAZA-ARI count recalculated on reduction

- **WHEN** a valid score reduction is accepted
- **THEN** the player's WAZA-ARI count SHALL decrease by the same amount as the score reduction (minimum 0)

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