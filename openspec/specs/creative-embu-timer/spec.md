# creative-embu-timer Specification

## Purpose

TBD - created by archiving change 'add-creative-embu'. Update Purpose after archive.

## Requirements

### Requirement: Sequence judge controls the performance timer

The sequence judge interface SHALL provide controls to start, pause/resume, and reset the timer. Pressing the Start button begins the timer; the Space key SHALL toggle between pause and resume while the timer is active. A separate Reset button SHALL reset elapsed time to zero without requiring the timer to be running.

#### Scenario: Timer started from zero

- **WHEN** the sequence judge presses the Start button while the timer is stopped and elapsed is 0
- **THEN** the system SHALL record `timerStartedAt` (current ISO timestamp) in `/creative_game_states` and broadcast a `timer:started` Socket.IO event with `{ eventId, startedAt: ISOString, elapsedMs: 0 }`

#### Scenario: Timer paused

- **WHEN** the sequence judge presses the Stop/Pause button (or Space key) while the timer is running
- **THEN** the system SHALL record `timerPausedAt` and compute `timerElapsedMs` = Date.now() − timerStartedAt + previousElapsedMs, update `/creative_game_states` with `timerElapsedMs` and `timerStatus: 'paused'`, and broadcast a `timer:stopped` event with `{ eventId, elapsedMs: number }`

#### Scenario: Timer resumed after pause

- **WHEN** the sequence judge presses the Resume button (or Space key) while the timer is paused
- **THEN** the system SHALL set a new `timerStartedAt` = now, preserve existing `timerElapsedMs` as the base offset, update `timerStatus: 'running'`, and broadcast a `timer:started` event with `{ eventId, startedAt: ISOString, elapsedMs: currentElapsedMs }`

#### Scenario: Timer reset

- **WHEN** the sequence judge presses the Reset button
- **THEN** the system SHALL set `timerElapsedMs: 0`, `timerStatus: 'idle'`, clear `timerStartedAt` and `timerPausedAt` in `/creative_game_states`, and broadcast a `timer:stopped` event with `{ eventId, elapsedMs: 0 }`

#### Scenario: Space key toggles pause/resume

- **WHEN** the sequence judge presses the Space key while the timer view is active
- **THEN** the system SHALL behave identically to pressing the Pause or Resume button depending on current timer status


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
### Requirement: Audience display shows live timer

The audience display page SHALL show the elapsed time in MM:SS format, updating every second while the timer is running.

#### Scenario: Timer displayed during performance

- **WHEN** the audience page receives a `timer:started` event
- **THEN** the page SHALL begin incrementing the displayed time from 0:00 every second

#### Scenario: Timer stops and final time shown

- **WHEN** the audience page receives a `timer:stopped` event
- **THEN** the page SHALL stop incrementing and display the final elapsed time


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
### Requirement: Valid performance time range

A performance duration SHALL be between 1 minute 30 seconds (90 seconds) and 2 minutes (120 seconds) to be considered within regulation time. The sequence judge interface SHALL visually indicate whether the stopped time is within, under, or over the regulation range.

#### Scenario: Time within regulation

- **WHEN** the timer is stopped at 105 seconds
- **THEN** the sequence judge interface SHALL display a green indicator showing the time is within regulation

#### Scenario: Time under minimum

- **WHEN** the timer is stopped at 85 seconds
- **THEN** the sequence judge interface SHALL display a yellow/warning indicator, and the under-time penalty option SHALL be highlighted as applicable

#### Scenario: Time over maximum

- **WHEN** the timer is stopped at 125 seconds
- **THEN** the sequence judge interface SHALL display a red indicator, and the overtime penalty option SHALL be highlighted as applicable

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
### Requirement: Timer display computed from timestamp, not interval increment

The frontend timer display SHALL compute elapsed time from `timerStartedAt` (a Date value) plus any previously accumulated `timerElapsedMs`, rather than blindly incrementing a counter. This ensures the display is accurate after page refresh and prevents NaN rendering.

#### Scenario: Timer display correct after page load

- **WHEN** the sequence judge's page loads and the timer is already running
- **THEN** the displayed elapsed time SHALL equal floor((Date.now() − timerStartedAt) / 1000) + floor(elapsedMs / 1000), shown in MM:SS format with no NaN values

#### Scenario: No NaN displayed

- **WHEN** `timerStartedAt` is null or cannot be parsed as a valid Date
- **THEN** the timer display SHALL show `00:00` instead of `NaN:NaN`

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