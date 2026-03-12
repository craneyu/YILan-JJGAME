# fighting-part-scoring Specification

## Purpose

TBD - created by archiving change 'fighting-v6-advanced-scoring'. Update Purpose after archive.

## Requirements

### Requirement: PART sectional score buttons

The referee interface SHALL display three score button groups — PART 1, PART 2, PART 3 — each containing four buttons: +2, +3, -2, -3. An ALL PARTS section SHALL contain +1 and -1 buttons that adjust the player's total score directly without associating with any PART.

#### Scenario: Referee clicks +2 in PART 1

- **WHEN** referee clicks +2 in the PART 1 group for a player
- **THEN** that player's PART 1 score SHALL increase by 2 AND the player's total score SHALL increase by 2 AND PART 1 IPPON count SHALL increase by 1

#### Scenario: Referee clicks +3 in PART 2

- **WHEN** referee clicks +3 in the PART 2 group for a player
- **THEN** that player's PART 2 score SHALL increase by 3 AND the player's total score SHALL increase by 3 AND PART 2 IPPON count SHALL increase by 1

#### Scenario: Referee clicks -2 in PART 3

- **WHEN** referee clicks -2 in the PART 3 group for a player
- **THEN** that player's PART 3 score SHALL decrease by 2 AND the player's total score SHALL decrease by 2 AND PART 3 IPPON count SHALL decrease by 1 (minimum 0)

#### Scenario: ALL PARTS +1 adjustment

- **WHEN** referee clicks +1 in the ALL PARTS section for a player
- **THEN** that player's total score SHALL increase by 1 AND no PART score or IPPON count SHALL change


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
### Requirement: PART score display above player card

The audience display SHALL render each player's P1/P2/P3 IPPON indicators as three vertically-stacked circular lights. Each circle SHALL display its label (P1, P2, or P3) centered inside the circle. A circle SHALL appear lit (yellow) when its IPPON count is greater than zero, and unlit (dark) when the count is zero. There SHALL be no outer rectangular border or container wrapping the three circles.

#### Scenario: All IPPON counts are zero

- **WHEN** a player's P1, P2, and P3 counts are all 0
- **THEN** all three circles SHALL appear unlit with dark background (`bg-white/10`) and muted label text (`text-white/30`)

#### Scenario: IPPON count becomes greater than zero

- **WHEN** a player's IPPON count for any part increases from 0 to 1 or more
- **THEN** the corresponding circle SHALL appear lit with yellow background (`bg-yellow-400`) and dark label text (`text-yellow-900`)

#### Scenario: IPPON count increases by 1 (flash animation)

- **WHEN** a player's IPPON count for any part increases by 1 (regardless of previous value)
- **THEN** the corresponding circle SHALL play a flash animation for approximately 600–700ms AND SHALL remain lit (yellow) after the animation completes

#### Scenario: Circles scale responsively

- **WHEN** the audience display is viewed on screens of different sizes
- **THEN** the circle diameter SHALL be `w-10 h-10` on small screens, `w-14 h-14` on md, `w-16 h-16` on lg, and `w-20 h-20` on xl and above


<!-- @trace
source: fighting-audience-penalty-lights
updated: 2026-03-12
code:
  - backend/src/controllers/matchScoreController.ts
  - frontend/src/app/features/fighting-audience/fighting-audience.component.ts
  - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
  - frontend/src/app/features/fighting-audience/fighting-audience.component.html
  - frontend/src/app/features/fighting-referee/fighting-referee.component.html
  - frontend/src/styles.css
-->

---
### Requirement: PART score and IPPON snapshot stored in log

Every scoring action on a PART button SHALL be persisted to `MatchScoreLog` with fields: `partIndex` (1, 2, or 3; null for ALL PARTS), `delta` (the score change), and `ipponsSnapshot` ({ p1, p2, p3 } counts after this action).

#### Scenario: Log entry created on PART scoring

- **WHEN** referee submits a PART score button action via the API
- **THEN** a `MatchScoreLog` document SHALL be created with `partIndex`, `delta`, and `ipponsSnapshot` fields populated correctly

#### Scenario: Log entry for ALL PARTS action

- **WHEN** referee submits an ALL PARTS +1 or -1 action
- **THEN** a `MatchScoreLog` document SHALL be created with `partIndex: null` and `ipponsSnapshot` unchanged from the previous log entry

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