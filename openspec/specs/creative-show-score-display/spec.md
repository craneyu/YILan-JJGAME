# creative-show-score-display Specification

## Purpose

TBD - created by archiving change 'fix-creative-show'. Update Purpose after archive.

## Requirements

### Requirement: Sequence judge timer view displays real-time calculated score

After all 5 scoring judges have submitted their scores, the sequence judge's timer view SHALL display the calculated results at the bottom of the screen. The display SHALL update automatically upon receiving the `creative:score:calculated` Socket.IO broadcast, without any manual action by the sequence judge.

#### Scenario: Score results appear after all judges submit

- **WHEN** the sequence judge's page receives a `creative:score:calculated` event matching the current `teamId`
- **THEN** the timer view SHALL immediately show a results panel below the timer containing: technicalTotal, artisticTotal, penalty deduction total, and finalScore

#### Scenario: Penalty details listed when deductions exist

- **WHEN** the received `creative:score:calculated` payload contains a non-empty `penalties` array
- **THEN** each penalty item SHALL be listed with its type label and deduction amount

#### Scenario: No penalty section shown when no deductions

- **WHEN** the received `creative:score:calculated` payload contains `penalties: []`
- **THEN** the results panel SHALL show zero deductions without listing individual penalty rows

#### Scenario: Score display cleared when new team is selected

- **WHEN** the sequence judge selects a different team from the team list
- **THEN** any previously displayed score results SHALL be cleared from the timer view


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
### Requirement: Audience page displays real-time score and team information

The audience display page SHALL update the current team's name and participant names in real-time when the sequence judge opens scoring for a new team. It SHALL also update score and penalty information in real-time when the `creative:score:calculated` event is received.

#### Scenario: Team name and participants update on scoring opened

- **WHEN** the audience page receives a `creative:scoring-opened` event
- **THEN** the page SHALL immediately update the displayed team name and participant names to match the event payload, without requiring a page reload

#### Scenario: Score and penalty display updates after calculation

- **WHEN** the audience page receives a `creative:score:calculated` event
- **THEN** the page SHALL immediately update to show: technicalTotal, artisticTotal, totalPenaltyDeduction, finalScore, and the list of penalty items with their deduction amounts

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
### Requirement: Audience page displays integrated single-line score

The audience display page SHALL present the technical score and artistic score side-by-side on a single row to optimize vertical space. The "Grand Total" (sum of technical and artistic before penalties) SHALL be removed from the display to focus on final results.

#### Scenario: Scores integrated into one line

- **WHEN** the audience page receives a `creative:score:calculated` event
- **THEN** the UI SHALL display technicalTotal and artisticTotal horizontally aligned in the same section
- **AND** the "Grand Total" label and value SHALL NOT be visible

#### Scenario: Final score remains prominent

- **WHEN** the score calculation results are displayed
- **THEN** the `finalScore` SHALL be displayed with the highest visual priority (largest font/prominent styling) to remain the focal point for the audience

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

---
### Requirement: Read-only score view for finished teams

In the creative sequence judge interface, when an "already finished" team is selected, the control area SHALL switch to a read-only results panel. This panel SHALL display the team's technical total, artistic total, final score, and any penalties recorded.

#### Scenario: Selection of finished team locks controls

- **WHEN** a sequence judge selects a team with `isFinished: true`
- **THEN** the Start Timer, Pause, and Open Scoring buttons SHALL be hidden
- **AND** a results summary panel SHALL be displayed, showing the calculated final score and a list of penalties

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