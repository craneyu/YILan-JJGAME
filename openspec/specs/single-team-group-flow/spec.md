# single-team-group-flow Specification

## Purpose

TBD - created by archiving change 'jujitsu-tournament-expansion'. Update Purpose after archive.

## Requirements

### Requirement: System detects single-team groups under tournament events

Under tournament events, the backend SHALL identify each `(category, tier)` group containing exactly one team and expose this state in the event summary endpoint. A `(category, tier)` group is a "single-team group" when exactly one Team document exists with that category-and-tier combination under the given Event.

#### Scenario: Single-team groups exposed in summary endpoint

- **WHEN** `GET /api/v1/events/:id/summary` is called for a tournament event with team distribution `{ male:EH:1, male:JH:3, female:EH:2 }`
- **THEN** the response SHALL include `singleTeamGroups: { "male:EH": true, "male:JH": false, "female:EH": false }`

##### Example: single-team group map structure

- **GIVEN** event with teams: 1 male EH team, 4 male JH teams, 2 female OPEN teams
- **WHEN** summary endpoint is called
- **THEN** `singleTeamGroups` SHALL equal `{ "male:EH": true, "male:JH": false, "female:OPEN": false }`


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

---
### Requirement: Sequence judge disables "next team" button for single-team groups

For teams belonging to a single-team `(category, tier)` group, the sequence judge interface SHALL keep the "換組" (next team) button disabled WHILE the team has uncompleted motions in the current round, OR (for EH/JH/SH/OPEN) WHILE the current team has remaining rounds to complete. Once the team finishes its current round's motions (and submits VR for non-elementary tiers), the button SHALL be re-enabled to:

1. Advance the same team to the next round (for EH/JH/SH/OPEN at round < 3), OR
2. Advance to the next `(tier, category)` group (for EL/EM, or when the current team has completed round 3).

The backend `POST /api/v1/flow/next-group` endpoint SHALL NOT reject calls from single-team groups; it SHALL advance per the per-team-rounds-first flow rules.

#### Scenario: Single-team EH stays disabled until current round complete

- **WHEN** a single-team female EH group has only completed A1 (round 1, partial)
- **THEN** the "換組" button SHALL remain disabled with `.disabled-btn` styling because the team has not completed its current round

#### Scenario: Single-team EH advances rounds within team

- **WHEN** a single-team female EH group completes A1–A3 (full round 1)
- **THEN** the "換組" button SHALL be enabled; clicking it SHALL advance the same team to round 2 (not to the next group)

#### Scenario: Single-team EH after round 3 advances to next group

- **WHEN** a single-team female EH group completes A1–A3, B1–B3, and C1–C3 (full 3 rounds)
- **THEN** clicking "換組" SHALL advance to the first team of the next non-empty `(tier, category)` group in the Excel-row execution order; the new team SHALL start at round 1

---
### Requirement: Series advance automatically within single-team groups for JH, SH, and OPEN tiers

For single-team groups in tournament events whose tier is `JH`, `SH`, or `OPEN`, the system SHALL eliminate any multi-round rotation concept within the single team's performance. After all motions in series A are scored and VR-A diversity is submitted, the sequence judge SHALL be able to open B1 directly (or call `POST /flow/next-group` to advance to round 2 of the same team). The same applies for the B → C transition.

The fixed motion progression order SHALL be: `A1 → A2 → ... → A<n> → VR-A → R2 → B1 → B2 → ... → B<n> → VR-B → R3 → C1 → ... → C<n> → VR-C → done`, where `<n>` is the per-series motion count for that tier (4 for male JH/SH/OPEN, 3 for female/mixed JH/SH/OPEN).

VR diversity submission SHALL remain the gate between series; it is the only required action at series boundaries for non-elementary single-team groups.

For EH tier single-team groups, the round progression (R1 → R2 → R3) follows the same pattern but SHALL NOT require VR submission at series boundaries (EH tier does not use VR scoring).

#### Scenario: Single-team SH advances through rounds via next-group

- **WHEN** a single-team male SH group completes A1–A4 scoring and VR judge submits A series diversity scores, then sequence judge calls `POST /flow/next-group`
- **THEN** the response SHALL succeed; the same team SHALL be set as `currentTeam` with `currentRound: 2`; the sequence judge UI SHALL show B1 as the next openable motion

#### Scenario: Single-team EH advances rounds without VR

- **WHEN** a single-team female EH group completes A1–A3 motion scoring and sequence judge calls `POST /flow/next-group`
- **THEN** the response SHALL succeed without checking VR; the team SHALL advance to round 2 (B series); subsequent rounds SHALL follow the same pattern without any VR gating

---
### Requirement: Audience display hides R and G labels for single-team groups

For teams belonging to a single-team group, the audience display header SHALL omit both the round indicator (R1/R2/R3) and the group position indicator (G1/G2/G3). The header SHALL display only the category and tier labels.

#### Scenario: Single-team group header rendering

- **WHEN** audience display loads for a tournament event team belonging to a single-team male EH group
- **THEN** the header SHALL display exactly `MALE EH` and SHALL NOT include any `R<n>` or `G<n>` suffix

#### Scenario: Multi-team group header rendering preserved

- **WHEN** audience display loads for a tournament event team belonging to a multi-team male JH group
- **THEN** the header SHALL display `MALE JH R<round>-G<group>` with the current round and group position

##### Example: header variations

| Group composition | Active team | Header text |
| ----------------- | ----------- | ----------- |
| male:EH = 1 team | The EH team | `MALE EH` |
| male:JH = 4 teams | Team 2 in round 1 | `MALE JH R1-G2` |
| sports-day, male = 3 teams | Team 1 in round 2 | `MALE R2-G1` (tier omitted) |


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

---
### Requirement: Multi-team groups preserve existing rotation behavior

Under tournament events, multi-team `(category, tier)` groups SHALL follow the **per-team-rounds-first** flow: each team in the group completes all of its rounds (R1 → R2 → R3 for EH/JH/SH/OPEN; or the A+B continuous flow for EL/EM) before the system advances to the next team in the same group. Within `(category, tier)` groups, the team execution order SHALL follow `Team.order` ascending.

The "換組" (next team) button SHALL advance to the next applicable target according to the team's tier:

- **EL/EM tiers**: after the team completes its A+B motions, "換組" advances to the next team in the same `(category, tier)` group (or the next group if the current team is the last). The new team's `currentRound` SHALL reset to 1.
- **EH/JH/SH/OPEN tiers**: if the team's `currentRound` is less than 3, "換組" advances the same team to `currentRound + 1`. If the team has completed round 3 (and any required VR submissions), "換組" advances to the next team in the same `(category, tier)` group (or to the next group if last). The new team's `currentRound` SHALL reset to 1.

Sports-day events (where `tier` is null on all teams) SHALL retain their existing category-major rotation behavior unchanged: R1 cycles through all teams in the current category, then R2 cycles through the same teams, then R3, before the system advances to the next category.

#### Scenario: Multi-team JH group advances per-team rounds-first

- **WHEN** a tournament event has 3 teams in the male JH group and sequence judge completes A1–A4 + VR-A for team 1
- **THEN** the "換組" button SHALL be enabled and SHALL advance team 1 to round 2 (B series), NOT advance to team 2's round 1

#### Scenario: Multi-team JH team completes all 3 rounds before next team

- **WHEN** team 1 in a multi-team male JH group completes A→B→C with all three VR submissions
- **THEN** the next "換組" SHALL advance to team 2 of the same group, starting at round 1 (A series)

#### Scenario: Sports-day rotation unchanged

- **WHEN** a sports-day event has 3 female teams in the male category and round 1 is in progress
- **THEN** the existing category-major flow SHALL apply: female team 1 → 2 → 3 all in R1, then female team 1 → 2 → 3 in R2, then R3, then advance to next category — unchanged from pre-change behavior

##### Example: 17-team tournament executes 35 steps in Excel-row order

- **GIVEN** a tournament event imported from Excel with 17 teams across 12 distinct `(tier, category)` groups
- **WHEN** the sequence judge initiates from the first team in Excel and calls `POST /flow/next-group` after each step
- **THEN** the system SHALL produce exactly 35 step transitions ending with `event_complete`, with each multi-round team consuming 3 consecutive steps (R1 → R2 → R3) before the next team
