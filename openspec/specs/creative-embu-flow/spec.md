# creative-embu-flow Specification

## Purpose

TBD - created by archiving change 'add-creative-embu'. Update Purpose after archive.

## Requirements

### Requirement: Sequence judge opens scoring for a team

Before scoring begins, the sequence judge SHALL select the correct team from a list sorted first by category (male / female / mixed) and then by team order within each category. After selecting the team, the judge opens scoring, which broadcasts the current team information to all connected clients.

#### Scenario: Team list sorted by category then order

- **WHEN** the sequence judge views the team selection list
- **THEN** the list SHALL be grouped by category in the order: female → male → mixed (or as configured by event `categoryOrder`), and within each category teams SHALL be ordered by ascending `order` value

#### Scenario: Sequence judge opens scoring

- **WHEN** the sequence judge calls `POST /api/v1/creative/flow/open-scoring` with `{ eventId, teamId }`
- **THEN** the system SHALL update `/creative_game_states` to `status: 'scoring_open'`, set `currentTeamId`, and broadcast a `creative:scoring-opened` event with `{ eventId, teamId, teamName, members: string[], category }`


<!-- @trace
source: fix-creative-show
updated: 2026-03-04
code:
  - .github/skills/spectra-archive/SKILL.md
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html
  - .github/skills/spectra-ask/SKILL.md
  - backend/src/controllers/creativePenaltyController.ts
  - .github/skills/spectra-debug/SKILL.md
  - backend/src/routes/creativeFlow.ts
  - backend/src/controllers/creativeFlowController.ts
  - backend/src/controllers/creativeTimerController.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.html
  - SPEC/SPEC-v3.md
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts
  - .github/skills/spectra-apply/SKILL.md
  - backend/src/controllers/creativeScoreController.ts
  - backend/src/controllers/teamController.ts
  - backend/src/models/CreativeGameState.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - .github/skills/spectra-propose/SKILL.md
  - .github/skills/spectra-discuss/SKILL.md
-->

---
### Requirement: Sequence judge confirms score collection and ends the round

After all 5 judges have submitted and the sequence judge confirms, the round for the current team SHALL conclude and the system SHALL display the final calculated score on the audience page.

#### Scenario: Sequence judge confirms score collection

- **WHEN** the sequence judge calls `POST /api/v1/creative/flow/confirm-scores` with `{ eventId, teamId }`
- **AND** all 5 judges have already submitted scores
- **THEN** the system SHALL update state to `status: 'complete'` for that team, and the audience display SHALL show the final score including penalties

#### Scenario: Confirm blocked if not all judges submitted

- **WHEN** the sequence judge attempts to confirm scores but fewer than 5 judges have submitted
- **THEN** the system SHALL reject the request with HTTP 400 and a message indicating the number of missing submissions


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
### Requirement: Sequence judge advances to the next team

After confirming scores for the current team, the sequence judge SHALL be able to advance to the next team.

#### Scenario: Advance to next team

- **WHEN** the sequence judge calls `POST /api/v1/creative/flow/next-team` with `{ eventId }`
- **THEN** the system SHALL reset all scoring state for the new team, clear penalty records, reset the timer state, and broadcast a `creative:team-changed` event with the next team's information


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
### Requirement: Creative event state management

The system SHALL maintain a `/creative_game_states` document per event tracking: `currentTeamId`, `timerStartedAt`, `timerStoppedAt`, `timerElapsedMs`, and `status` (idle | scoring_open | timer_running | timer_stopped | scores_collected | complete).

#### Scenario: State document created with event

- **WHEN** a creative type event is created via `POST /api/v1/events` with `competitionType: 'creative'`
- **THEN** the system SHALL create a corresponding `/creative_game_states` document with `status: 'idle'`

#### Scenario: State reset on next team

- **WHEN** `POST /api/v1/creative/flow/next-team` is called
- **THEN** the system SHALL reset `timerStartedAt`, `timerStoppedAt`, `timerElapsedMs` to null, set `status: 'scoring_open'` for the new team

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
### Requirement: Team list includes completion status

The backend API for listing teams SHALL include an `isFinished` boolean for each team in creative competition. A team SHALL be determined as finished if a record exists in `CreativeScore` for that team in the current event.

#### Scenario: Team list shows finished teams

- **WHEN** a sequence judge requests the team list for a creative event
- **THEN** each team object in the response SHALL contain an `isFinished` property
- **AND** if `isFinished` is true, the object SHALL also include `finalScore` and `totalPenaltyDeduction`

<!-- @trace
source: creative-judge-view-finished-teams
updated: 2026-03-04
code:
  - frontend/src/app/features/admin/admin.component.ts
  - .github/prompts/spectra-archive.prompt.md
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html
  - backend/src/controllers/creativePenaltyController.ts
  - frontend/src/app/features/admin/admin.component.html
  - SPEC/SPEC-v3.md
  - AGENTS.md
  - backend/src/controllers/eventController.ts
  - .github/skills/spectra-discuss/SKILL.md
  - backend/src/controllers/creativeTimerController.ts
  - backend/src/models/CreativeGameState.ts
  - backend/src/controllers/creativeScoreController.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.html
  - .github/skills/spectra-propose/SKILL.md
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts
  - .github/prompts/spectra-apply.prompt.md
  - .github/skills/spectra-archive/SKILL.md
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - .github/skills/spectra-debug/SKILL.md
  - frontend/src/app/features/scoring-judge/scoring-judge.component.ts
  - .github/prompts/spectra-propose.prompt.md
  - .github/skills/spectra-apply/SKILL.md
  - backend/src/routes/creativeFlow.ts
  - CLAUDE.md
  - .github/prompts/spectra-ask.prompt.md
  - .github/skills/spectra-ask/SKILL.md
  - .github/prompts/spectra-debug.prompt.md
  - backend/src/controllers/creativeFlowController.ts
  - backend/src/controllers/teamController.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/sequence-judge/sequence-judge.component.html
  - frontend/src/app/features/sequence-judge/sequence-judge.component.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.ts
  - .github/prompts/spectra-discuss.prompt.md
  - frontend/src/app/features/scoring-judge/scoring-judge.component.html
-->