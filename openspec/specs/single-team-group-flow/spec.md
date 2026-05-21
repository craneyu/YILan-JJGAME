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

For teams belonging to a single-team group (a `(category, tier)` group with exactly one team), the sequence judge interface SHALL keep the "換組" (next team) button disabled WHILE the team has uncompleted motions in the current round. Once the team completes its required motions (and VR scoring is submitted for non-elementary tiers), the button SHALL be re-enabled so the sequence judge can advance to the next non-empty `(tier, category)` group following the tier-primary sort order.

The backend `POST /api/v1/flow/next-group` endpoint SHALL NOT reject calls from single-team groups; the system SHALL advance to the next non-empty `(tier, category)` group per `tier → category → order` sort. Multi-team groups SHALL preserve their existing rotation behavior unchanged.

#### Scenario: Single-team group advances to next (tier, category) via next-group

- **WHEN** a tournament event has a single-team male EH group and the sequence judge calls `POST /api/v1/flow/next-group` after the team completed C series and all three VR rounds
- **THEN** the response SHALL succeed and the system SHALL set the active team to the first team of the next non-empty `(tier, category)` group in the tier-primary sort order

#### Scenario: Sequence judge keeps button disabled mid-performance

- **WHEN** a tournament event has a single-team female JH group and the team has only completed A1 of round 1
- **THEN** the "換組" button SHALL remain disabled with `.disabled-btn` styling because the team has not finished its current round

##### Example: 17-team tournament flows through 6 single-team groups without admin intervention

- **GIVEN** an event with 17 teams distributed across 8 `(tier, category)` groups, 6 of which are single-team (EM-female, EH-female, EH-mixed, JH-female, JH-male, JH-mixed, SH-male, OPEN-mixed)
- **WHEN** the sequence judge runs nextGroup after each group's completion
- **THEN** the active team advances automatically through all 17 teams without `400` errors, following the tier-primary sort order


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
### Requirement: Series advance automatically within single-team groups for JH, SH, and OPEN tiers

For single-team groups whose tier is `JH`, `SH`, or `OPEN`, the system SHALL eliminate the multi-round rotation concept within the single team's performance. After all motions in series A are scored and VR-A diversity is submitted, the sequence judge SHALL be able to open B1 directly without any explicit "next round" action. The same applies for the B→C transition.

The fixed motion progression order SHALL be: `A1 → A2 → ... → A<n> → (await VR-A) → B1 → B2 → ... → B<n> → (await VR-B) → C1 → ... → C<n> → (await VR-C) → done`, where `<n>` is the per-series motion count for that tier (4 for male JH/SH/OPEN, 3 for female/mixed JH/SH/OPEN).

VR diversity submission SHALL remain the gate between series; it is the only required action at series boundaries for single-team groups.

#### Scenario: Single-team SH group transitions from A to B

- **WHEN** a single-team male SH group completes A1–A4 scoring and VR judge submits A series diversity scores
- **THEN** the sequence judge UI SHALL display the B1 open button as the next available action, and SHALL NOT display any "next round" or "換輪" button

#### Scenario: Single-team OPEN group completes full performance

- **WHEN** a single-team female OPEN group performs through C series end
- **THEN** the entire sequence SHALL be `A1→A2→A3→(VR-A)→B1→B2→B3→(VR-B)→C1→C2→C3→(VR-C)→done` with no "next team" or "next round" actions invoked


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

Multi-team `(category, tier)` groups under tournament events SHALL retain the standard multi-round rotation behavior: R1 covers A series for all teams in the group, R2 covers B series for all teams, R3 covers C series for all teams. The "換組" button SHALL function normally to advance between teams within a round, and the "換輪" transition SHALL gate on completion of all teams' series and VR diversity submission.

#### Scenario: Multi-team JH group rotation

- **WHEN** a tournament event has 3 teams in the male JH group and sequence judge completes A1–A4 for team 1
- **THEN** the "換組" button SHALL be enabled and SHALL transition the active team to team 2 (still in round 1, A series)

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