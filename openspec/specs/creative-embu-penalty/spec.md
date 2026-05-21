# creative-embu-penalty Specification

## Purpose

TBD - created by archiving change 'add-creative-embu'. Update Purpose after archive.

## Requirements

### Requirement: Sequence judge marks violation penalties

The sequence judge SHALL be able to mark one or more violation penalties for a team's performance. Each penalty type is independent and MAY be applied in combination.

Penalty types and deductions:
- `overtime`: Performance exceeded 2 minutes → deduct 1.0 point
- `undertime`: Performance was under 1 minute 30 seconds → deduct 1.0 point
- `props`: More than 2 props used → deduct 1.0 point
- `attacks`: Failed to meet minimum attack count → deduct 0.5 points

#### Scenario: Single penalty applied

- **WHEN** the sequence judge marks the `overtime` penalty for a team
- **THEN** the system SHALL persist a `/creative_penalties` record with `penaltyType: 'overtime'` and `deduction: 1.0`, and broadcast a `penalty:updated` Socket.IO event

#### Scenario: Multiple penalties applied simultaneously

- **WHEN** the sequence judge marks both `overtime` and `props` penalties
- **THEN** the system SHALL store two separate records and the total deduction SHALL be 2.0 points

#### Scenario: Penalty removed

- **WHEN** the sequence judge deselects a previously marked penalty
- **THEN** the system SHALL delete the corresponding record and broadcast an updated `penalty:updated` event with the revised penalty list


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
### Requirement: Penalties affect final score calculation

When computing a team's final score, the system SHALL sum all active penalty deductions for that team and subtract from the grand total. The final score SHALL NOT be negative; if penalties exceed the grand total, the final score SHALL be 0.

#### Scenario: Final score with penalties

- **WHEN** a team's grandTotal is 42.5 and they have `overtime` (-1.0) and `attacks` (-0.5) penalties
- **THEN** finalScore = 42.5 - 1.0 - 0.5 = 41.0

#### Scenario: Penalties cannot produce negative final score

- **WHEN** a team's grandTotal is 1.0 and total penalties are 2.0
- **THEN** finalScore SHALL be 0.0, not -1.0


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
### Requirement: Penalties visible on audience display

The audience display SHALL show any applied penalties for the current team with penalty type labels and total deduction amount.

#### Scenario: Penalty displayed to audience

- **WHEN** a `penalty:updated` event is received with active penalties
- **THEN** the audience display SHALL render each penalty type as a warning label and show the total deduction amount

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
### Requirement: Elementary tier teams exempt from creative time penalty

Under tournament events, creative-embu time-based penalties (overtime and undertime, each -1 point) SHALL NOT apply to teams whose `tier` is `EL`, `EM`, or `EH`. Other penalty types (props usage, insufficient attacks, etc.) SHALL continue to apply unchanged for elementary tier teams. For sports-day events and for non-elementary tournament tiers (JH, OPEN), time-based penalties SHALL apply as in the existing behavior.

The backend `creativeScoring` utility SHALL check the team's tier before applying the time-based deduction. The creative scoring judge interface SHALL hide or visually disable the "overtime" / "undertime" indicators when the active team's tier is elementary.

#### Scenario: Elementary team performs overtime without penalty

- **WHEN** a tournament event EL team performs creative embu for 2 minutes 30 seconds (30 seconds over the standard 2-minute limit) and the scoring judges submit their scores
- **THEN** the calculated final score SHALL NOT include the -1 overtime deduction, and the audience display SHALL NOT show an overtime warning indicator

##### Example: penalty matrix

| Event type | Tier | Time penalty applies? | Other penalties? |
| ---------- | ---- | --------------------- | ---------------- |
| sports-day | (n/a) | Yes | Yes |
| tournament | EL | No | Yes |
| tournament | EM | No | Yes |
| tournament | EH | No | Yes |
| tournament | JH | Yes | Yes |
| tournament | OPEN | Yes | Yes |

#### Scenario: JH team in tournament still penalized for overtime

- **WHEN** a tournament event JH team performs creative embu 30 seconds over the 2-minute limit
- **THEN** the final score SHALL include the -1 overtime deduction (existing behavior preserved for non-elementary tournament tiers)

<!-- @trace
source: jujitsu-tournament-expansion
updated: 2026-05-20
code:
  - SPEC/錦標賽規格需求/SPEC-v3.md
  - backend/src/controllers/flowController.ts
  - .spectra.yaml
  - backend/src/utils/teamSort.ts
  - .github/prompts/spectra-commit.prompt.md
  - .github/prompts/spectra-drift.prompt.md
  - .github/skills/spectra-commit/SKILL.md
  - backend/src/models/Match.ts
  - CLAUDE.md
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/controllers/wrongAttackController.ts
  - backend/src/models/Event.ts
  - frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.html
  - frontend/src/app/features/sequence-judge/sequence-judge.component.ts
  - .github/prompts/spectra-ingest.prompt.md
  - .github/skills/spectra-discuss/SKILL.md
  - .github/prompts/spectra-ask.prompt.md
  - .github/prompts/spectra-archive.prompt.md
  - .github/skills/spectra-drift/SKILL.md
  - .github/skills/spectra-apply/SKILL.md
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts
  - .github/skills/spectra-archive/SKILL.md
  - frontend/src/app/features/admin/event-list/event-list.component.html
  - frontend/src/app/features/audience/audience.component.ts
  - backend/src/controllers/eventController.ts
  - backend/src/models/Team.ts
  - backend/src/controllers/vrScoreController.ts
  - .github/prompts/spectra-discuss.prompt.md
  - .github/prompts/spectra-debug.prompt.md
  - .github/prompts/spectra-audit.prompt.md
  - backend/src/controllers/teamController.ts
  - .github/skills/spectra-ingest/SKILL.md
  - backend/src/controllers/creativePenaltyController.ts
  - frontend/src/app/features/vr-judge/vr-judge.component.html
  - .github/skills/spectra-propose/SKILL.md
  - backend/src/utils/tournament.ts
  - frontend/src/app/features/vr-judge/vr-judge.component.ts
  - .github/prompts/spectra-apply.prompt.md
  - frontend/src/app/features/admin/event-list/event-list.component.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/core/models/match.model.ts
  - AGENTS.md
  - .github/prompts/spectra-propose.prompt.md
  - SPEC/錦標賽規格需求/SPEC-v2.md
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html
-->