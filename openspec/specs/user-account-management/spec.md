# user-account-management Specification

## Purpose

TBD - created by archiving change 'user-account-management'. Update Purpose after archive.

## Requirements

### Requirement: Admin can create a new user account

The system SHALL provide an account creation form on the judge management page. The admin SHALL be able to specify username (required), password (required), and role (required, selected from a predefined list). On successful creation, the new account SHALL appear in the user list immediately.

#### Scenario: Admin creates a new account

- **WHEN** admin fills in username, password, and selects a role, then submits the form
- **THEN** the system SHALL call `POST /api/v1/auth/register` with the provided data
- **THEN** the new account SHALL appear in the user list
- **THEN** a success toast notification SHALL be shown

#### Scenario: Admin submits without required fields

- **WHEN** admin submits the creation form with any required field empty
- **THEN** the system SHALL NOT call the API
- **THEN** the system SHALL show a validation warning


<!-- @trace
source: user-account-management
updated: 2026-03-13
code:
  - backend/src/controllers/authController.ts
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/features/referee-landing/referee-landing.component.html
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.html
  - backend/src/controllers/eventController.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/app.routes.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - package-docker.sh
  - frontend/src/app/features/admin/event-list/event-list.component.ts
  - jju-docker-20260313-1347.tar.gz
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - backend/src/routes/auth.ts
  - frontend/src/app/features/referee-landing/referee-landing.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - jju-docker-20260313-1428.tar.gz
  - jju-docker-20260313.tar.gz
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/features/admin/event-list/event-list.component.html
  - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/admin/judge-management/judge-management.component.html
  - frontend/src/app/features/admin/judge-management/judge-management.component.ts
  - backend/src/models/Event.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - frontend/src/app/features/admin/admin.component.html
-->

---
### Requirement: Admin can change a user's role inline

The system SHALL allow the admin to change a user's role directly in the user list without navigating to a separate page. Only one row SHALL be in edit mode at a time.

#### Scenario: Admin edits a user's role

- **WHEN** admin clicks the edit button on a user row
- **THEN** the row SHALL display a role dropdown with the current role selected
- **WHEN** admin selects a new role and confirms
- **THEN** the system SHALL call `PATCH /api/v1/auth/users/:id/role` with the new role
- **THEN** the row SHALL return to read-only display with the updated role

#### Scenario: Admin cancels role edit

- **WHEN** admin clicks cancel during inline edit
- **THEN** the row SHALL return to read-only display with the original role unchanged


<!-- @trace
source: user-account-management
updated: 2026-03-13
code:
  - backend/src/controllers/authController.ts
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/features/referee-landing/referee-landing.component.html
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.html
  - backend/src/controllers/eventController.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/app.routes.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - package-docker.sh
  - frontend/src/app/features/admin/event-list/event-list.component.ts
  - jju-docker-20260313-1347.tar.gz
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - backend/src/routes/auth.ts
  - frontend/src/app/features/referee-landing/referee-landing.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - jju-docker-20260313-1428.tar.gz
  - jju-docker-20260313.tar.gz
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/features/admin/event-list/event-list.component.html
  - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/admin/judge-management/judge-management.component.html
  - frontend/src/app/features/admin/judge-management/judge-management.component.ts
  - backend/src/models/Event.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - frontend/src/app/features/admin/admin.component.html
-->

---
### Requirement: Admin can delete a user account

The system SHALL allow the admin to delete a user account from the user list. The system SHALL require confirmation before deletion. An admin SHALL NOT be able to delete their own account.

#### Scenario: Admin deletes a user account

- **WHEN** admin clicks the delete button on a user row and confirms the dialog
- **THEN** the system SHALL call `DELETE /api/v1/auth/users/:id`
- **THEN** the user SHALL be removed from the list
- **THEN** a success toast notification SHALL be shown

#### Scenario: Admin attempts to delete own account

- **WHEN** admin clicks delete on their own account row
- **THEN** the system SHALL return a 400 error
- **THEN** the system SHALL display an error message


<!-- @trace
source: user-account-management
updated: 2026-03-13
code:
  - backend/src/controllers/authController.ts
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/features/referee-landing/referee-landing.component.html
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.html
  - backend/src/controllers/eventController.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/app.routes.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - package-docker.sh
  - frontend/src/app/features/admin/event-list/event-list.component.ts
  - jju-docker-20260313-1347.tar.gz
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - backend/src/routes/auth.ts
  - frontend/src/app/features/referee-landing/referee-landing.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - jju-docker-20260313-1428.tar.gz
  - jju-docker-20260313.tar.gz
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/features/admin/event-list/event-list.component.html
  - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/admin/judge-management/judge-management.component.html
  - frontend/src/app/features/admin/judge-management/judge-management.component.ts
  - backend/src/models/Event.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - frontend/src/app/features/admin/admin.component.html
-->

---
### Requirement: Role selection is limited to authenticated roles

The role dropdown SHALL only offer the following options: `scoring_judge` (計分裁判), `vr_judge` (VR 裁判), `sequence_judge` (賽序裁判), `match_referee` (場次裁判), `check_in_officer` (檢錄員), `admin` (管理員). The `audience` role SHALL NOT be selectable as audiences do not require login.

#### Scenario: Admin selects check_in_officer role

- **WHEN** admin opens the role dropdown for a user row
- **THEN** the dropdown SHALL include the option labeled "檢錄員" mapping to the role value `check_in_officer`

#### Scenario: Audience role omitted from dropdown

- **WHEN** admin opens the role dropdown
- **THEN** the option `audience` SHALL NOT appear


<!-- @trace
source: check-in-and-weigh-in-system
updated: 2026-06-24
code:
  - frontend/src/app/features/check-in/check-in.component.ts
  - frontend/src/app/features/contact-audience/contact-audience.component.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - frontend/src/app/features/fighting-audience/fighting-audience.component.ts
  - frontend/src/app/shared/participant-badge.component.ts
  - backend/src/controllers/creativeRankingsController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - backend/src/controllers/teamController.ts
  - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
  - backend/src/models/Team.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - TESTING.md
  - frontend/tsconfig.spec.json
  - backend/src/index.ts
  - frontend/jest.config.js
  - backend/package.json
  - backend/src/controllers/checkInController.ts
  - frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.ts
  - frontend/src/app/app.routes.ts
  - frontend/package.json
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - frontend/src/app/features/login/login.component.ts
  - backend/src/controllers/eventController.ts
  - backend/src/seeds/initialUsers.ts
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/controllers/creativeTimerController.ts
  - backend/src/utils/forfeitPropagation.ts
  - frontend/src/app/features/check-in/check-in.component.html
  - frontend/src/app/features/contact-referee/contact-referee.component.ts
  - backend/src/controllers/matchScoreController.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - backend/src/models/User.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/setup-jest.ts
  - backend/src/routes/checkIn.ts
  - frontend/src/app/features/admin/judge-management/judge-management.component.ts
  - frontend/src/app/features/contact-referee/contact-referee.component.html
  - frontend/src/app/features/fighting-referee/fighting-referee.component.html
  - frontend/tsconfig.json
  - backend/src/seeds/migrateMembersToObjects.ts
  - backend/jest.config.js
  - frontend/src/app/core/utils/match-grouping.ts
  - backend/src/controllers/creativeFlowController.ts
tests:
  - frontend/src/app/core/utils/match-grouping.spec.ts
  - frontend/src/app/shared/participant-badge.component.spec.ts
  - backend/src/utils/__tests__/scoring.test.ts
  - backend/src/utils/__tests__/forfeitPropagation.test.ts
  - backend/src/models/__tests__/Team.test.ts
-->

---
### Requirement: check_in_officer role is a recognized user role across backend and frontend

The string `check_in_officer` SHALL be a valid value of the user role enum on both backend (`backend/src/models/User.ts` role enum) and frontend (`frontend/src/app/core/services/auth.service.ts` `UserRole` type union).

Backend authentication middleware SHALL accept JWTs signed with `role: 'check_in_officer'`. The frontend `roleGuard(...roles)` SHALL recognize `'check_in_officer'` as a permitted argument.

The frontend Chinese label for `check_in_officer` SHALL be `檢錄員` across all UI surfaces (role dropdown, user list, navigation menu).

#### Scenario: User created with check_in_officer role

- **WHEN** admin creates a new user with `{ username: 'checkin', password: 'checkin123', role: 'check_in_officer' }`
- **THEN** the User document SHALL be persisted with `role: 'check_in_officer'`
- **AND** a subsequent login SHALL succeed and return a JWT containing `role: 'check_in_officer'`

#### Scenario: Initial seed user provides default check_in_officer credentials

- **WHEN** the initial user seed runs on a fresh database
- **THEN** the seed SHALL create a user with `username: 'checkin'`, password hash matching `checkin123`, and `role: 'check_in_officer'`

<!-- @trace
source: check-in-and-weigh-in-system
updated: 2026-06-24
code:
  - frontend/src/app/features/check-in/check-in.component.ts
  - frontend/src/app/features/contact-audience/contact-audience.component.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - frontend/src/app/features/fighting-audience/fighting-audience.component.ts
  - frontend/src/app/shared/participant-badge.component.ts
  - backend/src/controllers/creativeRankingsController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - backend/src/controllers/teamController.ts
  - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
  - backend/src/models/Team.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - TESTING.md
  - frontend/tsconfig.spec.json
  - backend/src/index.ts
  - frontend/jest.config.js
  - backend/package.json
  - backend/src/controllers/checkInController.ts
  - frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.ts
  - frontend/src/app/app.routes.ts
  - frontend/package.json
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - frontend/src/app/features/login/login.component.ts
  - backend/src/controllers/eventController.ts
  - backend/src/seeds/initialUsers.ts
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/controllers/creativeTimerController.ts
  - backend/src/utils/forfeitPropagation.ts
  - frontend/src/app/features/check-in/check-in.component.html
  - frontend/src/app/features/contact-referee/contact-referee.component.ts
  - backend/src/controllers/matchScoreController.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - backend/src/models/User.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/setup-jest.ts
  - backend/src/routes/checkIn.ts
  - frontend/src/app/features/admin/judge-management/judge-management.component.ts
  - frontend/src/app/features/contact-referee/contact-referee.component.html
  - frontend/src/app/features/fighting-referee/fighting-referee.component.html
  - frontend/tsconfig.json
  - backend/src/seeds/migrateMembersToObjects.ts
  - backend/jest.config.js
  - frontend/src/app/core/utils/match-grouping.ts
  - backend/src/controllers/creativeFlowController.ts
tests:
  - frontend/src/app/core/utils/match-grouping.spec.ts
  - frontend/src/app/shared/participant-badge.component.spec.ts
  - backend/src/utils/__tests__/scoring.test.ts
  - backend/src/utils/__tests__/forfeitPropagation.test.ts
  - backend/src/models/__tests__/Team.test.ts
-->