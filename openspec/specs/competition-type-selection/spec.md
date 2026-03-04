# competition-type-selection Specification

## Purpose

TBD - created by archiving change 'add-creative-embu'. Update Purpose after archive.

## Requirements

### Requirement: Login page presents competition type selection

After the user has successfully authenticated (and selected an event if required), the system SHALL present competition type selection when the user's event supports multiple types. The available options SHALL be dynamically determined from the authenticated user's assigned event `competitionTypes` array. Only competition types present in the event's `competitionTypes` SHALL be rendered as selectable cards. If the event supports only one type, that type SHALL be automatically selected and the selection UI SHALL be skipped entirely.

#### Scenario: Post-login type selection for multi-type event

- **WHEN** a user successfully logs in and their assigned event has `competitionTypes: ['Duo', 'Show']`
- **THEN** two cards SHALL be displayed after the login step: "雙人演武" and "創意演武", both selectable, before routing to the role destination

#### Scenario: Active event supports only Duo

- **WHEN** a user successfully logs in and their assigned event has `competitionTypes: ['Duo']`
- **THEN** the competition type selection UI SHALL be skipped, `competitionType: 'kata'` SHALL be automatically stored in localStorage, and the user SHALL be routed directly to their role destination

#### Scenario: Active event supports only Show

- **WHEN** a user successfully logs in and their assigned event has `competitionTypes: ['Show']`
- **THEN** the competition type selection UI SHALL be skipped, `competitionType: 'creative'` SHALL be automatically stored in localStorage, and the user SHALL be routed directly to their role destination

#### Scenario: Login form is always visible on page load

- **WHEN** the login page first loads regardless of the active event's competition types
- **THEN** the credential entry form SHALL be visible and the competition type selection cards SHALL NOT be shown before login


<!-- @trace
source: login-first-then-select-type
updated: 2026-03-04
code:
  - backend/src/controllers/creativeRankingsController.ts
  - backend/src/controllers/creativeScoreController.ts
  - frontend/src/app/app.routes.ts
  - backend/src/controllers/creativeFlowController.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.html
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.ts
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html
  - backend/src/models/Team.ts
  - backend/src/routes/creativeFlow.ts
  - frontend/src/app/features/admin/admin.component.html
  - backend/src/utils/creativeScoring.ts
  - SPEC/SPEC-v3.md
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/models/CreativePenalty.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - backend/src/controllers/creativeTimerController.ts
  - backend/src/controllers/teamController.ts
  - SPEC/SPEC-v2.md
  - backend/src/routes/creativePenalties.ts
  - backend/src/models/CreativeScore.ts
  - backend/src/routes/events.ts
  - backend/src/routes/creativeScores.ts
  - backend/src/index.ts
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/login/login.component.html
  - backend/src/controllers/eventController.ts
  - backend/src/models/CreativeGameState.ts
  - backend/src/sockets/index.ts
  - backend/src/models/Event.ts
  - backend/src/controllers/creativePenaltyController.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - backend/src/seeds/migrateEventTypes.ts
-->

---
### Requirement: Selected competition type persists after login

After successful login, the selected competition type SHALL be stored in localStorage as `competitionType` with value `'kata'` (for Duo) or `'creative'` (for Show).

#### Scenario: Duo type stored after login

- **WHEN** a user selects "雙人演武" and successfully completes the login flow
- **THEN** `localStorage.getItem('competitionType')` SHALL return `'kata'`

#### Scenario: Show type stored after login

- **WHEN** a user selects "創意演武" and successfully completes the login flow
- **THEN** `localStorage.getItem('competitionType')` SHALL return `'creative'`


<!-- @trace
source: login-first-then-select-type
updated: 2026-03-04
code:
  - backend/src/controllers/creativeRankingsController.ts
  - backend/src/controllers/creativeScoreController.ts
  - frontend/src/app/app.routes.ts
  - backend/src/controllers/creativeFlowController.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.html
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.ts
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html
  - backend/src/models/Team.ts
  - backend/src/routes/creativeFlow.ts
  - frontend/src/app/features/admin/admin.component.html
  - backend/src/utils/creativeScoring.ts
  - SPEC/SPEC-v3.md
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/models/CreativePenalty.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - backend/src/controllers/creativeTimerController.ts
  - backend/src/controllers/teamController.ts
  - SPEC/SPEC-v2.md
  - backend/src/routes/creativePenalties.ts
  - backend/src/models/CreativeScore.ts
  - backend/src/routes/events.ts
  - backend/src/routes/creativeScores.ts
  - backend/src/index.ts
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/login/login.component.html
  - backend/src/controllers/eventController.ts
  - backend/src/models/CreativeGameState.ts
  - backend/src/sockets/index.ts
  - backend/src/models/Event.ts
  - backend/src/controllers/creativePenaltyController.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - backend/src/seeds/migrateEventTypes.ts
-->

---
### Requirement: Router directs users based on competition type

After login, the router SHALL redirect users to role-appropriate pages based on `competitionType` stored in localStorage:
- `kata`: routes `/judge/scoring`, `/judge/sequence`, `/judge/vr`, `/audience`, `/admin`
- `creative`: routes `/creative/judge/scoring`, `/creative/judge/sequence`, `/creative/audience`, `/creative/admin`

#### Scenario: Scoring judge redirected after kata login

- **WHEN** a scoring_judge logs in with competition type "雙人演武"
- **THEN** the router SHALL navigate to `/judge/scoring`

#### Scenario: Scoring judge redirected after show login

- **WHEN** a scoring_judge logs in with competition type "創意演武"
- **THEN** the router SHALL navigate to `/creative/judge/scoring`

<!-- @trace
source: login-first-then-select-type
updated: 2026-03-04
code:
  - backend/src/controllers/creativeRankingsController.ts
  - backend/src/controllers/creativeScoreController.ts
  - frontend/src/app/app.routes.ts
  - backend/src/controllers/creativeFlowController.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.html
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.ts
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html
  - backend/src/models/Team.ts
  - backend/src/routes/creativeFlow.ts
  - frontend/src/app/features/admin/admin.component.html
  - backend/src/utils/creativeScoring.ts
  - SPEC/SPEC-v3.md
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/models/CreativePenalty.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - backend/src/controllers/creativeTimerController.ts
  - backend/src/controllers/teamController.ts
  - SPEC/SPEC-v2.md
  - backend/src/routes/creativePenalties.ts
  - backend/src/models/CreativeScore.ts
  - backend/src/routes/events.ts
  - backend/src/routes/creativeScores.ts
  - backend/src/index.ts
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/login/login.component.html
  - backend/src/controllers/eventController.ts
  - backend/src/models/CreativeGameState.ts
  - backend/src/sockets/index.ts
  - backend/src/models/Event.ts
  - backend/src/controllers/creativePenaltyController.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - backend/src/seeds/migrateEventTypes.ts
-->