# creative-embu-scoring Specification

## Purpose

TBD - created by archiving change 'add-creative-embu'. Update Purpose after archive.

## Requirements

### Requirement: Judge submits technical and artistic scores

Each of 5 scoring judges SHALL submit exactly one technical score and one artistic score per team performance. Each score SHALL be a number from 0 to 9.5 in increments of 0.5 (i.e. 0, 0.5, 1.0, 1.5, ... 9.0, 9.5). The technical score and artistic score SHALL be entered independently. The system SHALL reject any score outside the range 0–9.5 or not a multiple of 0.5.

#### Scenario: Valid score submission

- **WHEN** a scoring judge submits a technical score of 8.5 and an artistic score of 7.0
- **THEN** the system persists the scores to `/creative_scores` with the judge's identity and responds with HTTP 201

#### Scenario: Invalid score value rejected — out of range

- **WHEN** a scoring judge submits a technical score of 10.0
- **THEN** the system SHALL reject the request with HTTP 400

#### Scenario: Invalid score value rejected — not a multiple of 0.5

- **WHEN** a scoring judge submits a technical score of 7.3
- **THEN** the system SHALL reject the request with HTTP 400

#### Scenario: Duplicate submission rejected

- **WHEN** a scoring judge who already submitted attempts to submit again for the same team
- **THEN** the system SHALL reject the request with HTTP 409


<!-- @trace
source: add-creative-embu
updated: 2026-03-04
code:
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts
  - backend/src/controllers/creativeTimerController.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/controllers/eventController.ts
  - backend/src/models/CreativeGameState.ts
  - SPEC/SPEC-v2.md
  - backend/src/routes/creativePenalties.ts
  - backend/src/routes/creativeFlow.ts
  - backend/src/models/CreativeScore.ts
  - backend/src/controllers/creativeFlowController.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.html
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.ts
  - backend/src/models/CreativePenalty.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - backend/src/utils/creativeScoring.ts
  - backend/src/models/Event.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - backend/src/controllers/creativeRankingsController.ts
  - backend/src/controllers/creativeScoreController.ts
  - backend/src/index.ts
  - backend/src/routes/events.ts
  - frontend/src/app/app.routes.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/login/login.component.ts
  - backend/src/routes/creativeScores.ts
  - backend/src/controllers/creativePenaltyController.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/login/login.component.html
-->

---
### Requirement: Final score calculated when all 5 judges have submitted

When all 5 judges have submitted their scores for a team, the system SHALL automatically calculate the final score. Calculation: for each score type (technical, artistic), remove the highest and lowest values, then sum the remaining 3. The grand total is the sum of the technical total and artistic total. Penalty deductions are subtracted from the grand total to produce the final score.

#### Scenario: Score calculation with all 5 judges submitted

- **WHEN** the 5th judge submits their score
- **THEN** the system SHALL compute: technicalTotal = sum of middle 3 technical scores, artisticTotal = sum of middle 3 artistic scores, grandTotal = technicalTotal + artisticTotal, finalScore = grandTotal - totalPenaltyDeduction
- **AND** the system SHALL broadcast a `creative-score:calculated` Socket.IO event to the event room with the computed values

#### Scenario: Maximum possible final score

- **WHEN** all 5 judges submit technical=9.5 and artistic=9.5 and no penalties exist
- **THEN** technicalTotal = 28.5 (middle 3 × 9.5), artisticTotal = 28.5, grandTotal = 57.0, finalScore = 57.0


<!-- @trace
source: add-creative-embu
updated: 2026-03-04
code:
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts
  - backend/src/controllers/creativeTimerController.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/controllers/eventController.ts
  - backend/src/models/CreativeGameState.ts
  - SPEC/SPEC-v2.md
  - backend/src/routes/creativePenalties.ts
  - backend/src/routes/creativeFlow.ts
  - backend/src/models/CreativeScore.ts
  - backend/src/controllers/creativeFlowController.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.html
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.ts
  - backend/src/models/CreativePenalty.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - backend/src/utils/creativeScoring.ts
  - backend/src/models/Event.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - backend/src/controllers/creativeRankingsController.ts
  - backend/src/controllers/creativeScoreController.ts
  - backend/src/index.ts
  - backend/src/routes/events.ts
  - frontend/src/app/app.routes.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/login/login.component.ts
  - backend/src/routes/creativeScores.ts
  - backend/src/controllers/creativePenaltyController.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/login/login.component.html
-->

---
### Requirement: Score input UI uses 9-grid integer selector and decimal toggle

The scoring judge interface SHALL use a two-part input control for each score (technical and artistic):
1. **Integer part**: A 3×3 grid of buttons showing digits 0–9 (with 0 occupying the bottom-center or an extra cell). Clicking a digit sets the integer component of the score. Valid integer values are 0–9.
2. **Decimal part**: A single toggle button displaying either `.0` or `.5`. Each click SHALL alternate between the two values. The decimal part SHALL default to `.0` and SHALL NOT reset when a new integer is selected.

The complete score SHALL be `integer + decimal` (e.g., integer=9 + decimal=.5 → score=9.5; integer=9 + decimal=.0 → score=9.0). A score SHALL NOT be considered entered until the integer part has been selected. The valid range is 0.0–9.5.

#### Scenario: Judge selects integer via 9-grid

- **WHEN** a judge taps the "8" cell in the integer grid
- **THEN** the integer part SHALL be set to 8 and the current composite score SHALL display as "8.0" (using the current decimal value)

#### Scenario: Judge toggles decimal

- **WHEN** the decimal button currently shows ".0" and the judge clicks it
- **THEN** the decimal button SHALL change to ".5" and the composite score SHALL update accordingly

#### Scenario: Score display before integer is selected

- **WHEN** the judge has not yet tapped any integer cell
- **THEN** no score is considered entered and the submit button SHALL remain disabled


<!-- @trace
source: add-creative-embu
updated: 2026-03-04
code:
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts
  - backend/src/controllers/creativeTimerController.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/controllers/eventController.ts
  - backend/src/models/CreativeGameState.ts
  - SPEC/SPEC-v2.md
  - backend/src/routes/creativePenalties.ts
  - backend/src/routes/creativeFlow.ts
  - backend/src/models/CreativeScore.ts
  - backend/src/controllers/creativeFlowController.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.html
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.ts
  - backend/src/models/CreativePenalty.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - backend/src/utils/creativeScoring.ts
  - backend/src/models/Event.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - backend/src/controllers/creativeRankingsController.ts
  - backend/src/controllers/creativeScoreController.ts
  - backend/src/index.ts
  - backend/src/routes/events.ts
  - frontend/src/app/app.routes.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/login/login.component.ts
  - backend/src/routes/creativeScores.ts
  - backend/src/controllers/creativePenaltyController.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/login/login.component.html
-->

---
### Requirement: Scoring state transitions for judges

The scoring judge interface SHALL display three states: waiting, scoring, and submitted. Judges SHALL only be able to input scores when in the scoring state.

#### Scenario: Judge enters scoring state

- **WHEN** the sequence judge opens scoring for a team via `POST /api/v1/creative/flow/open-scoring`
- **THEN** all connected scoring judges SHALL receive a `creative:scoring-opened` Socket.IO event and transition to the scoring state

#### Scenario: Judge transitions to submitted state

- **WHEN** the judge submits both technical and artistic scores
- **THEN** the judge's interface SHALL transition to the submitted state and display the submitted values as read-only

#### Scenario: Judge cannot submit partial scores

- **WHEN** a judge has entered a technical score but not an artistic score
- **THEN** the "Confirm and Submit" button SHALL remain disabled

<!-- @trace
source: add-creative-embu
updated: 2026-03-04
code:
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts
  - backend/src/controllers/creativeTimerController.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/controllers/eventController.ts
  - backend/src/models/CreativeGameState.ts
  - SPEC/SPEC-v2.md
  - backend/src/routes/creativePenalties.ts
  - backend/src/routes/creativeFlow.ts
  - backend/src/models/CreativeScore.ts
  - backend/src/controllers/creativeFlowController.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.html
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.ts
  - backend/src/models/CreativePenalty.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - backend/src/utils/creativeScoring.ts
  - backend/src/models/Event.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - backend/src/controllers/creativeRankingsController.ts
  - backend/src/controllers/creativeScoreController.ts
  - backend/src/index.ts
  - backend/src/routes/events.ts
  - frontend/src/app/app.routes.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/login/login.component.ts
  - backend/src/routes/creativeScores.ts
  - backend/src/controllers/creativePenaltyController.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/login/login.component.html
-->