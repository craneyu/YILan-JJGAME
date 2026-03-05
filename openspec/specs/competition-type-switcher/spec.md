# competition-type-switcher Specification

## Purpose

TBD - created by archiving change 'judge-competition-type-selection'. Update Purpose after archive.

## Requirements

### Requirement: Competition type switcher displayed in judge and audience pages

Authenticated judge and audience pages SHALL display a competition type switcher when the user's assigned event supports multiple competition types. The switcher SHALL show the current competition type name and allow the user to switch to the alternate type with a single click. The switcher SHALL only be visible when `eventCompetitionTypes.length > 1`; it SHALL be hidden for single-type events.

#### Scenario: Switcher visible for multi-type event

- **WHEN** a scoring judge is on `/judge/scoring` and their event has `competitionTypes: ['Duo', 'Show']`
- **THEN** a switcher element SHALL be visible in the page header showing the current type (e.g., "雙人演武")
- **AND** the switcher SHALL include a button to switch to "創意演武"

#### Scenario: Switcher hidden for single-type event

- **WHEN** a scoring judge is on `/judge/scoring` and their event has `competitionTypes: ['Duo']`
- **THEN** no competition type switcher SHALL be rendered on the page

#### Scenario: Switcher triggers navigation on click

- **WHEN** a scoring judge on `/judge/scoring` (kata) clicks the switcher
- **THEN** `competitionType: 'creative'` SHALL be stored in localStorage
- **AND** the router SHALL navigate to `/creative/scoring`

#### Scenario: Sequence judge switches competition type

- **WHEN** a sequence judge on `/judge/sequence` (kata) clicks the switcher
- **THEN** `competitionType: 'creative'` SHALL be stored in localStorage
- **AND** the router SHALL navigate to `/creative/sequence`

#### Scenario: Audience switcher navigates between audience pages

- **WHEN** an audience viewer on `/audience?eventId=<id>` views an event with `competitionTypes: ['Duo', 'Show']`
- **AND** they click the competition type switcher
- **THEN** the router SHALL navigate to `/creative/audience?eventId=<id>`

#### Scenario: Reverse switch from creative back to kata

- **WHEN** a scoring judge on `/creative/scoring` (creative) clicks the switcher
- **THEN** `competitionType: 'kata'` SHALL be stored in localStorage
- **AND** the router SHALL navigate to `/judge/scoring`


<!-- @trace
source: judge-competition-type-selection
updated: 2026-03-04
code:
  - .github/skills/spectra-apply/SKILL.md
  - .github/skills/spectra-ask/SKILL.md
  - frontend/src/app/features/sequence-judge/sequence-judge.component.html
  - backend/src/controllers/eventController.ts
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html
  - frontend/src/app/core/services/auth.service.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - frontend/src/app/features/scoring-judge/scoring-judge.component.html
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - .github/skills/spectra-discuss/SKILL.md
  - .github/skills/spectra-archive/SKILL.md
  - frontend/src/app/features/audience/audience.component.ts
  - .github/skills/spectra-propose/SKILL.md
  - frontend/src/app/features/audience/audience.component.html
  - frontend/src/app/features/scoring-judge/scoring-judge.component.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.html
  - .github/skills/spectra-debug/SKILL.md
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/sequence-judge/sequence-judge.component.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.ts
-->

---
### Requirement: Event competition types persisted in localStorage after login

After successful authentication and event resolution, the authenticated user's event `competitionTypes` array SHALL be stored in localStorage under the key `jju_event_competition_types` as a JSON string. `AuthService` SHALL read this value on initialization and expose it as the `eventCompetitionTypes` signal of type `Signal<('Duo' | 'Show')[]>`.

#### Scenario: Event types stored at login

- **WHEN** a user completes login and their event has `competitionTypes: ['Duo', 'Show']`
- **THEN** `localStorage.getItem('jju_event_competition_types')` SHALL return `'["Duo","Show"]'`
- **AND** `auth.eventCompetitionTypes()` SHALL return `['Duo', 'Show']`

#### Scenario: Event types cleared at logout

- **WHEN** a user logs out
- **THEN** `localStorage.getItem('jju_event_competition_types')` SHALL return `null`
- **AND** `auth.eventCompetitionTypes()` SHALL return `[]`


<!-- @trace
source: judge-competition-type-selection
updated: 2026-03-04
code:
  - .github/skills/spectra-apply/SKILL.md
  - .github/skills/spectra-ask/SKILL.md
  - frontend/src/app/features/sequence-judge/sequence-judge.component.html
  - backend/src/controllers/eventController.ts
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html
  - frontend/src/app/core/services/auth.service.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - frontend/src/app/features/scoring-judge/scoring-judge.component.html
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - .github/skills/spectra-discuss/SKILL.md
  - .github/skills/spectra-archive/SKILL.md
  - frontend/src/app/features/audience/audience.component.ts
  - .github/skills/spectra-propose/SKILL.md
  - frontend/src/app/features/audience/audience.component.html
  - frontend/src/app/features/scoring-judge/scoring-judge.component.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.html
  - .github/skills/spectra-debug/SKILL.md
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/sequence-judge/sequence-judge.component.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.ts
-->

---
### Requirement: Summary API includes event competition types

The `GET /events/:id/summary` response SHALL include `competitionTypes: string[]` within the `event` object. This allows the audience page to determine whether to display the competition type switcher without requiring authentication.

#### Scenario: Summary returns competition types

- **WHEN** a client calls `GET /events/:id/summary`
- **THEN** the response `event` object SHALL include `competitionTypes: ['Duo', 'Show']` (or whichever types the event supports)

#### Scenario: Audience page shows switcher based on summary data

- **WHEN** the audience page loads and the summary response contains `event.competitionTypes: ['Duo', 'Show']`
- **THEN** the competition type switcher SHALL be visible on the audience page

<!-- @trace
source: judge-competition-type-selection
updated: 2026-03-04
code:
  - .github/skills/spectra-apply/SKILL.md
  - .github/skills/spectra-ask/SKILL.md
  - frontend/src/app/features/sequence-judge/sequence-judge.component.html
  - backend/src/controllers/eventController.ts
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html
  - frontend/src/app/core/services/auth.service.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - frontend/src/app/features/scoring-judge/scoring-judge.component.html
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - .github/skills/spectra-discuss/SKILL.md
  - .github/skills/spectra-archive/SKILL.md
  - frontend/src/app/features/audience/audience.component.ts
  - .github/skills/spectra-propose/SKILL.md
  - frontend/src/app/features/audience/audience.component.html
  - frontend/src/app/features/scoring-judge/scoring-judge.component.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.html
  - .github/skills/spectra-debug/SKILL.md
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/sequence-judge/sequence-judge.component.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.ts
-->