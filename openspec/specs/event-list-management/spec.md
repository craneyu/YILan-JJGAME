# event-list-management Specification

## Purpose

Provides a standalone event list management page at `/admin/events` that serves as the admin's entry point after login. The page enables creating, listing, editing, and deleting events, and navigating into a specific event's dashboard.

## Requirements

### Requirement: Admin can view all events on a dedicated event list page

The system SHALL provide a standalone event list page at `/admin/events` where the admin can see all events. The page SHALL display each event's name, date, venue, and status. The page SHALL be the first page shown after the admin logs in.

#### Scenario: Admin lands on event list after login

- **WHEN** a user with role `admin` successfully logs in
- **THEN** the system SHALL navigate to `/admin/events`
- **THEN** the page SHALL display a list of all existing events

#### Scenario: No events exist

- **WHEN** admin visits `/admin/events` and no events have been created
- **THEN** the page SHALL display an empty state message indicating no events are available

<!-- @trace
source: admin-event-centric-navigation
updated: 2026-03-13
code:
  - frontend/src/app/features/admin/event-list/event-list.component.ts
  - frontend/src/app/features/admin/event-list/event-list.component.html
  - frontend/src/app/app.routes.ts
  - frontend/src/app/features/login/login.component.ts
-->


<!-- @trace
source: admin-event-centric-navigation
updated: 2026-03-13
code:
  - jju-docker-20260313.tar.gz
  - frontend/src/app/features/admin/event-list/event-list.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/features/admin/admin.component.html
  - backend/src/models/Event.ts
  - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
  - frontend/src/app/features/referee-landing/referee-landing.component.html
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/features/admin/judge-management/judge-management.component.html
  - jju-package/images.tar.gz
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.ts
  - frontend/src/app/features/admin/judge-management/judge-management.component.ts
  - frontend/src/app/features/referee-landing/referee-landing.component.ts
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/controllers/eventController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/app.routes.ts
  - package-docker.sh
  - frontend/src/app/features/admin/event-list/event-list.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.html
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
-->

---
### Requirement: Admin can create a new event from the event list page

The system SHALL provide an event creation form on the `/admin/events` page. The admin SHALL be able to specify the event name (required), date (optional), venue (optional), and competition types (Duo and/or Show, at least one required). On successful creation, the new event SHALL appear in the list immediately.

#### Scenario: Admin creates a new event

- **WHEN** admin fills in the event name and selects at least one competition type and submits the form
- **THEN** the system SHALL call `POST /api/v1/events` with the provided data
- **THEN** the new event SHALL appear in the event list
- **THEN** a success toast notification SHALL be shown

#### Scenario: Admin submits event creation without a name

- **WHEN** admin submits the event creation form without an event name
- **THEN** the system SHALL NOT call the API
- **THEN** the system SHALL show a validation error

#### Scenario: Admin submits event creation without selecting a competition type

- **WHEN** admin submits the event creation form with no competition types selected
- **THEN** the system SHALL NOT call the API
- **THEN** the system SHALL show a validation error

<!-- @trace
source: admin-event-centric-navigation
updated: 2026-03-13
code:
  - frontend/src/app/features/admin/event-list/event-list.component.ts
  - frontend/src/app/features/admin/event-list/event-list.component.html
-->


<!-- @trace
source: admin-event-centric-navigation
updated: 2026-03-13
code:
  - jju-docker-20260313.tar.gz
  - frontend/src/app/features/admin/event-list/event-list.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/features/admin/admin.component.html
  - backend/src/models/Event.ts
  - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
  - frontend/src/app/features/referee-landing/referee-landing.component.html
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/features/admin/judge-management/judge-management.component.html
  - jju-package/images.tar.gz
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.ts
  - frontend/src/app/features/admin/judge-management/judge-management.component.ts
  - frontend/src/app/features/referee-landing/referee-landing.component.ts
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/controllers/eventController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/app.routes.ts
  - package-docker.sh
  - frontend/src/app/features/admin/event-list/event-list.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.html
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
-->

---
### Requirement: Admin can delete an event from the event list page

The system SHALL allow the admin to delete an event directly from the event list. Before deletion, the system SHALL prompt for confirmation using SweetAlert2. On confirmation, the event SHALL be removed from the list.

#### Scenario: Admin deletes an event with confirmation

- **WHEN** admin clicks the delete button on an event and confirms the SweetAlert2 dialog
- **THEN** the system SHALL call `DELETE /api/v1/events/:id`
- **THEN** the event SHALL be removed from the list
- **THEN** a success toast notification SHALL be shown

#### Scenario: Admin cancels event deletion

- **WHEN** admin clicks the delete button on an event but cancels the SweetAlert2 dialog
- **THEN** the system SHALL NOT call the API
- **THEN** the event SHALL remain in the list

<!-- @trace
source: admin-event-centric-navigation
updated: 2026-03-13
code:
  - frontend/src/app/features/admin/event-list/event-list.component.ts
  - frontend/src/app/features/admin/event-list/event-list.component.html
-->


<!-- @trace
source: admin-event-centric-navigation
updated: 2026-03-13
code:
  - jju-docker-20260313.tar.gz
  - frontend/src/app/features/admin/event-list/event-list.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/features/admin/admin.component.html
  - backend/src/models/Event.ts
  - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
  - frontend/src/app/features/referee-landing/referee-landing.component.html
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/features/admin/judge-management/judge-management.component.html
  - jju-package/images.tar.gz
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.ts
  - frontend/src/app/features/admin/judge-management/judge-management.component.ts
  - frontend/src/app/features/referee-landing/referee-landing.component.ts
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/controllers/eventController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/app.routes.ts
  - package-docker.sh
  - frontend/src/app/features/admin/event-list/event-list.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.html
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
-->

---
### Requirement: Admin navigates into an event from the event list

Each event in the list SHALL have an entry point (e.g., a "管理" button or clickable row) that navigates to the event dashboard at `/admin/events/:eventId`.

#### Scenario: Admin enters an event

- **WHEN** admin clicks the entry point for a specific event on `/admin/events`
- **THEN** the system SHALL navigate to `/admin/events/:eventId` where `:eventId` is that event's MongoDB `_id`

<!-- @trace
source: admin-event-centric-navigation
updated: 2026-03-13
code:
  - frontend/src/app/features/admin/event-list/event-list.component.ts
  - frontend/src/app/features/admin/event-list/event-list.component.html
  - frontend/src/app/app.routes.ts
-->

<!-- @trace
source: admin-event-centric-navigation
updated: 2026-03-13
code:
  - jju-docker-20260313.tar.gz
  - frontend/src/app/features/admin/event-list/event-list.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/features/admin/admin.component.html
  - backend/src/models/Event.ts
  - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
  - frontend/src/app/features/referee-landing/referee-landing.component.html
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/features/admin/judge-management/judge-management.component.html
  - jju-package/images.tar.gz
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.ts
  - frontend/src/app/features/admin/judge-management/judge-management.component.ts
  - frontend/src/app/features/referee-landing/referee-landing.component.ts
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/controllers/eventController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/app.routes.ts
  - package-docker.sh
  - frontend/src/app/features/admin/event-list/event-list.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.html
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
-->

---
### Requirement: Admin can navigate to judge management from the event list page

The event list page (`/admin/events`) SHALL provide a "裁判管理" button in the header action area. Clicking the button SHALL navigate to `/admin/judges`.

#### Scenario: Admin clicks judge management button on event list page

- **WHEN** admin is on `/admin/events` and clicks the "裁判管理" button
- **THEN** the system SHALL navigate to `/admin/judges`

<!-- @trace
source: judge-management-navigation
updated: 2026-03-13
code:
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/features/admin/event-list/event-list.component.html
  - backend/src/routes/auth.ts
  - jju-docker-20260313-1347.tar.gz
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - backend/src/controllers/authController.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - frontend/src/app/app.routes.ts
  - package-docker.sh
  - jju-docker-20260313.tar.gz
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - backend/src/models/Event.ts
  - jju-docker-20260313-1428.tar.gz
  - frontend/src/app/features/admin/judge-management/judge-management.component.ts
  - frontend/src/app/features/admin/event-list/event-list.component.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - frontend/src/app/features/admin/judge-management/judge-management.component.html
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - backend/src/controllers/eventController.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.html
  - frontend/src/app/features/referee-landing/referee-landing.component.html
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.ts
  - frontend/src/app/features/referee-landing/referee-landing.component.ts
-->

---
### Requirement: Event model includes competition type field

The Event Mongoose model SHALL include a `competitionType` field of type string with allowed values `'sports-day'` or `'tournament'` and default value `'sports-day'`. The field SHALL be required at the schema level (with the default ensuring backward compatibility for existing documents).

#### Scenario: Legacy event document loaded from database

- **WHEN** an Event document persisted before this change is loaded via Mongoose
- **THEN** the `competitionType` field SHALL resolve to `'sports-day'` through the schema default without requiring data migration

#### Scenario: Tournament event creation persists field

- **WHEN** `POST /api/v1/events` is called with `{ name: '柔術錦標賽 2026', competitionType: 'tournament' }`
- **THEN** the persisted document SHALL contain `competitionType: 'tournament'`


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
### Requirement: Event list distinguishes competition type

The event list page SHALL render a visible label or badge on each event card indicating its competition type. The label SHALL read "運動會" for `sports-day` events and "錦標賽" for `tournament` events.

#### Scenario: Event list shows tournament badge

- **WHEN** the event list contains both sports-day and tournament events
- **THEN** each event card SHALL display its respective competition type label, allowing admin to visually distinguish the two types

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