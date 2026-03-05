# creative-show-timer-ux Specification

## Purpose

TBD - created by archiving change 'fix-creative-show'. Update Purpose after archive.

## Requirements

### Requirement: Timer view displays current team information in real-time

The sequence judge's timer view SHALL display the current team's category, team name, and participant names at all times. This information SHALL update immediately whenever the sequence judge selects a different team, without requiring a page reload.

#### Scenario: Team info shown when timer is idle

- **WHEN** the sequence judge has selected a team and the timer view is displayed
- **THEN** the timer view SHALL show: the team's category label (男子組/女子組/混合組), the team name, and the comma-separated participant names

#### Scenario: Team info updates when team is changed

- **WHEN** the sequence judge selects a different team from the team list
- **THEN** the timer view SHALL immediately update category, team name, and participant names to reflect the newly selected team

#### Scenario: Placeholder shown when no team selected

- **WHEN** no team has been selected yet
- **THEN** the timer view SHALL display a placeholder message instead of team information


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
### Requirement: Timer view provides pause, resume, and reset controls

The sequence judge timer view SHALL provide three distinct controls: Start/Pause/Resume (toggling with Space key), and a separate Reset button. The timer state SHALL persist in `/creative_game_states` so that page reloads restore the correct state.

#### Scenario: Pause button visible while running

- **WHEN** the timer is in `running` status
- **THEN** the UI SHALL display a Pause button (or equivalent label change) and the Space key SHALL pause the timer

#### Scenario: Resume button visible while paused

- **WHEN** the timer is in `paused` status
- **THEN** the UI SHALL display a Resume button and the Space key SHALL resume the timer

#### Scenario: Reset button always visible

- **WHEN** the timer view is displayed regardless of timer status
- **THEN** a Reset button SHALL be visible; clicking it SHALL reset elapsed time to 00:00 and set status to idle

#### Scenario: Page reload restores timer state

- **WHEN** the sequence judge reloads the page while the timer is paused with accumulated elapsed time
- **THEN** the displayed elapsed time SHALL restore to the saved `timerElapsedMs` value in MM:SS format

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
### Requirement: Audience page features a compact integrated layout

The audience display page SHALL use a redesigned layout that groups team information, the timer, and integrated scores into a cohesive visual structure that minimizes wasted space and enhances readability on large screens.

#### Scenario: Redesigned layout structure

- **WHEN** the audience page is active
- **THEN** the layout SHALL feature a clear hierarchy: team info (top), followed by a combined section for timer and integrated scoring details
- **AND** the arrangement SHALL adapt to different screen sizes using responsive design principles to prevent element overlap or excessive stretching

<!-- @trace
source: redesign-audience-scoring-layout
updated: 2026-03-04
code:
  - .github/skills/spectra-debug/SKILL.md
  - backend/src/controllers/eventController.ts
  - .github/prompts/spectra-debug.prompt.md
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - .github/prompts/spectra-discuss.prompt.md
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts
  - AGENTS.md
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html
  - CLAUDE.md
  - SPEC/SPEC-v3.md
  - frontend/src/app/features/admin/admin.component.html
  - backend/src/routes/creativeFlow.ts
  - .github/skills/spectra-archive/SKILL.md
  - .github/prompts/spectra-propose.prompt.md
  - frontend/src/app/features/sequence-judge/sequence-judge.component.html
  - backend/src/controllers/creativePenaltyController.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.html
  - frontend/src/app/features/scoring-judge/scoring-judge.component.ts
  - frontend/src/app/core/services/socket.service.ts
  - .github/prompts/spectra-apply.prompt.md
  - backend/src/controllers/creativeTimerController.ts
  - backend/src/controllers/creativeScoreController.ts
  - backend/src/controllers/teamController.ts
  - .github/prompts/spectra-ask.prompt.md
  - .github/skills/spectra-apply/SKILL.md
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/sequence-judge/sequence-judge.component.ts
  - .github/skills/spectra-ask/SKILL.md
  - backend/src/models/CreativeGameState.ts
  - .github/prompts/spectra-archive.prompt.md
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - frontend/src/app/features/scoring-judge/scoring-judge.component.html
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.ts
  - .github/skills/spectra-discuss/SKILL.md
  - .github/skills/spectra-propose/SKILL.md
  - backend/src/controllers/creativeFlowController.ts
-->