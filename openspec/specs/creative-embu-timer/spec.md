# creative-embu-timer Specification

## Purpose

TBD - created by archiving change 'add-creative-embu'. Update Purpose after archive.

## Requirements

### Requirement: Sequence judge controls the performance timer

The sequence judge interface SHALL provide a single button to start and stop the timer. Pressing the button once starts the timer; pressing it again stops the timer. The keyboard shortcut Space SHALL toggle the timer (start if stopped, stop if running).

#### Scenario: Timer started

- **WHEN** the sequence judge presses the timer button (or Space key) while the timer is stopped
- **THEN** the system SHALL record `timerStartedAt` in `/creative_game_states` and broadcast a `timer:started` Socket.IO event to the event room with `{ eventId, startedAt: ISOString }`

#### Scenario: Timer stopped

- **WHEN** the sequence judge presses the timer button (or Space key) while the timer is running
- **THEN** the system SHALL record `timerStoppedAt` and compute `timerElapsedMs`, update `/creative_game_states`, and broadcast a `timer:stopped` Socket.IO event with `{ eventId, elapsedMs: number }`

#### Scenario: Space key toggles timer

- **WHEN** the sequence judge presses the Space key
- **THEN** the system SHALL behave identically to clicking the timer button


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