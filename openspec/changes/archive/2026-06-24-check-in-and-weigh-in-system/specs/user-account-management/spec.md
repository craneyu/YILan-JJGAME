## MODIFIED Requirements

### Requirement: Role selection is limited to authenticated roles

The role dropdown SHALL only offer the following options: `scoring_judge` (計分裁判), `vr_judge` (VR 裁判), `sequence_judge` (賽序裁判), `match_referee` (場次裁判), `check_in_officer` (檢錄員), `admin` (管理員). The `audience` role SHALL NOT be selectable as audiences do not require login.

#### Scenario: Admin selects check_in_officer role

- **WHEN** admin opens the role dropdown for a user row
- **THEN** the dropdown SHALL include the option labeled "檢錄員" mapping to the role value `check_in_officer`

#### Scenario: Audience role omitted from dropdown

- **WHEN** admin opens the role dropdown
- **THEN** the option `audience` SHALL NOT appear

## ADDED Requirements

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
