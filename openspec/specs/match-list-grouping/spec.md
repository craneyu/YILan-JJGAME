# match-list-grouping Specification

## Purpose

TBD - created by archiving change 'match-list-grouped'. Update Purpose after archive.

## Requirements

### Requirement: Match list grouped by category and weight class

The fighting-referee and ne-waza-referee components SHALL display the match list grouped by category (male/female/mixed) and then by weight class within each category. Matches within each weight class group SHALL be sorted by `scheduledOrder` ascending.

#### Scenario: Groups appear in correct category order

- **WHEN** the match list is loaded with matches of multiple categories
- **THEN** male group SHALL appear first, female group second, mixed group third

#### Scenario: Weight classes appear in spec-defined order

- **WHEN** matches with multiple weight classes exist within a category
- **THEN** weight classes SHALL appear in the fixed order defined by the official weight class specification (e.g., -56, -62, -69, -77, -85, -94, +94 for male)

#### Scenario: Matches within a weight class are sorted by scheduledOrder

- **WHEN** multiple matches exist in the same category and weight class
- **THEN** they SHALL be displayed in ascending `scheduledOrder`

#### Scenario: Unknown weight class appears last

- **WHEN** a match has a `weightClass` value not found in the fixed order table
- **THEN** it SHALL be appended after all known weight classes within its category group

#### Scenario: Empty category is not shown

- **WHEN** no matches exist for a category
- **THEN** that category group header SHALL NOT be rendered


<!-- @trace
source: match-list-grouped
updated: 2026-03-12
code:
  - .github/prompts/spectra-ask.prompt.md
  - .github/prompts/spectra-audit.prompt.md
  - .github/prompts/spectra-propose.prompt.md
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - .github/prompts/spectra-discuss.prompt.md
  - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
  - .github/prompts/spectra-apply.prompt.md
  - .github/prompts/spectra-debug.prompt.md
  - frontend/src/app/features/fighting-referee/fighting-referee.component.html
  - frontend/src/app/core/utils/match-grouping.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - .github/skills/spectra-apply/SKILL.md
  - .github/prompts/spectra-archive.prompt.md
  - CLAUDE.md
-->

---
### Requirement: Group headers display category and weight class labels

The list view SHALL render a category section header for each category group and a weight class sub-header for each weight class group.

#### Scenario: Category header displays Chinese label

- **WHEN** a category group is rendered
- **THEN** the header SHALL display the Chinese label: male → "男子組", female → "女子組", mixed → "混合組"

#### Scenario: Weight class sub-header displays weight class string

- **WHEN** a weight class group is rendered
- **THEN** the sub-header SHALL display the `weightClass` string value (e.g., "-56 公斤級")

<!-- @trace
source: match-list-grouped
updated: 2026-03-12
code:
  - .github/prompts/spectra-ask.prompt.md
  - .github/prompts/spectra-audit.prompt.md
  - .github/prompts/spectra-propose.prompt.md
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - .github/prompts/spectra-discuss.prompt.md
  - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
  - .github/prompts/spectra-apply.prompt.md
  - .github/prompts/spectra-debug.prompt.md
  - frontend/src/app/features/fighting-referee/fighting-referee.component.html
  - frontend/src/app/core/utils/match-grouping.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - .github/skills/spectra-apply/SKILL.md
  - .github/prompts/spectra-archive.prompt.md
  - CLAUDE.md
-->

---
### Requirement: Completed matches are displayed after pending and in-progress matches

The fighting-referee and ne-waza-referee components SHALL order matches within each weight class group by `status` first (pending and in-progress matches before completed matches), then by `scheduledOrder` ascending within each status partition. This ordering SHALL be applied client-side via the component's computed/sort logic and SHALL NOT require any backend ordering change.

The contact-referee component, if it renders the same match list pattern, SHALL apply the same ordering rule.

#### Scenario: Pending matches float above completed matches

- **WHEN** a weight class group contains matches with statuses `[completed, pending, completed, pending]` originally interleaved by `scheduledOrder`
- **THEN** the rendered order SHALL be the two pending matches first (sorted by `scheduledOrder`), then the two completed matches (sorted by `scheduledOrder`)

##### Example: mixed status ordering

- **GIVEN** matches in one weight class group:
  | matchId | scheduledOrder | status |
  |---|---|---|
  | M1 | 1 | completed |
  | M2 | 2 | pending |
  | M3 | 3 | completed |
  | M4 | 4 | in-progress |
- **WHEN** the list is rendered
- **THEN** the display order SHALL be: M4 (in-progress, order 4), M2 (pending, order 2), M1 (completed, order 1), M3 (completed, order 3)

#### Scenario: A referee finishes a match and the list re-orders

- **WHEN** the referee finalizes the currently in-progress match and the component returns to the list view
- **THEN** the just-completed match SHALL appear below all remaining pending matches within its weight class group
- **AND** the next pending match SHALL appear at the top of the group's section


<!-- @trace
source: match-list-completion-ux
updated: 2026-06-24
code:
  - backend/src/sockets/index.ts
  - backend/src/controllers/creativeRankingsController.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/contact-audience/contact-audience.component.ts
  - backend/src/controllers/matchScoreController.ts
  - frontend/setup-jest.ts
  - backend/src/controllers/eventController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - frontend/tsconfig.spec.json
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - backend/jest.config.js
  - frontend/src/app/features/contact-referee/contact-referee.component.html
  - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
  - backend/src/controllers/checkInController.ts
  - backend/src/models/User.ts
  - frontend/src/app/features/contact-referee/contact-referee.component.ts
  - backend/src/routes/checkIn.ts
  - backend/src/seeds/migrateMembersToObjects.ts
  - frontend/src/app/features/fighting-audience/fighting-audience.component.ts
  - backend/src/utils/forfeitPropagation.ts
  - frontend/package.json
  - frontend/src/app/app.routes.ts
  - backend/package.json
  - frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.ts
  - frontend/src/app/features/check-in/check-in.component.ts
  - backend/src/index.ts
  - backend/src/controllers/creativeFlowController.ts
  - frontend/src/app/shared/participant-badge.component.ts
  - frontend/src/app/features/check-in/check-in.component.html
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/tsconfig.json
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/core/utils/match-grouping.ts
  - frontend/src/app/features/admin/judge-management/judge-management.component.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - frontend/src/app/core/services/auth.service.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - TESTING.md
  - backend/src/seeds/initialUsers.ts
  - frontend/src/app/features/fighting-referee/fighting-referee.component.html
  - backend/src/models/Team.ts
  - backend/src/controllers/creativeTimerController.ts
  - backend/src/controllers/teamController.ts
  - frontend/jest.config.js
tests:
  - frontend/src/app/core/utils/match-grouping.spec.ts
  - backend/src/utils/__tests__/forfeitPropagation.test.ts
  - backend/src/utils/__tests__/scoring.test.ts
  - backend/src/models/__tests__/Team.test.ts
  - frontend/src/app/shared/participant-badge.component.spec.ts
-->

---
### Requirement: Completed match rows are visually distinguished from pending rows

The fighting-referee, ne-waza-referee, and contact-referee match list components SHALL apply a distinct background tint to completed match rows so they are visually separable from pending and in-progress rows.

Completed rows SHALL use a tinted background utility (for example `bg-emerald-500/10`) on top of the base `.glass-card` style, and SHALL reduce the primary text saturation (for example `text-white/60`). Pending rows SHALL retain the default `.glass-card` appearance; in-progress rows SHALL retain the existing yellow status badge.

#### Scenario: Completed row uses emerald tint

- **WHEN** the match list renders a row whose `status === 'completed'`
- **THEN** that row SHALL include the tinted background class so it appears visually distinct from a default pending row in the same weight class group

#### Scenario: Pending row appearance unchanged

- **WHEN** the match list renders a row whose `status === 'pending'`
- **THEN** the row SHALL render with the default `.glass-card` style without the completed tint

<!-- @trace
source: match-list-completion-ux
updated: 2026-06-24
code:
  - backend/src/sockets/index.ts
  - backend/src/controllers/creativeRankingsController.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/contact-audience/contact-audience.component.ts
  - backend/src/controllers/matchScoreController.ts
  - frontend/setup-jest.ts
  - backend/src/controllers/eventController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - frontend/tsconfig.spec.json
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - backend/jest.config.js
  - frontend/src/app/features/contact-referee/contact-referee.component.html
  - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
  - backend/src/controllers/checkInController.ts
  - backend/src/models/User.ts
  - frontend/src/app/features/contact-referee/contact-referee.component.ts
  - backend/src/routes/checkIn.ts
  - backend/src/seeds/migrateMembersToObjects.ts
  - frontend/src/app/features/fighting-audience/fighting-audience.component.ts
  - backend/src/utils/forfeitPropagation.ts
  - frontend/package.json
  - frontend/src/app/app.routes.ts
  - backend/package.json
  - frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.ts
  - frontend/src/app/features/check-in/check-in.component.ts
  - backend/src/index.ts
  - backend/src/controllers/creativeFlowController.ts
  - frontend/src/app/shared/participant-badge.component.ts
  - frontend/src/app/features/check-in/check-in.component.html
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/tsconfig.json
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/core/utils/match-grouping.ts
  - frontend/src/app/features/admin/judge-management/judge-management.component.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - frontend/src/app/core/services/auth.service.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - TESTING.md
  - backend/src/seeds/initialUsers.ts
  - frontend/src/app/features/fighting-referee/fighting-referee.component.html
  - backend/src/models/Team.ts
  - backend/src/controllers/creativeTimerController.ts
  - backend/src/controllers/teamController.ts
  - frontend/jest.config.js
tests:
  - frontend/src/app/core/utils/match-grouping.spec.ts
  - backend/src/utils/__tests__/forfeitPropagation.test.ts
  - backend/src/utils/__tests__/scoring.test.ts
  - backend/src/models/__tests__/Team.test.ts
  - frontend/src/app/shared/participant-badge.component.spec.ts
-->