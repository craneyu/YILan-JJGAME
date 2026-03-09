# admin-sport-navigation Specification

## Purpose

TBD - created by archiving change 'admin-sport-selector'. Update Purpose after archive.

## Requirements

### Requirement: Admin sees sport selection page after login

After successful login, the admin role SHALL be directed to a sport selection page at `/admin` that displays four sport type cards: 演武 (Duo+Show), 寢技 (Ne-Waza), 對打 (Fighting), and 格鬥 (Contact). Each card SHALL navigate to the corresponding management page when clicked.

#### Scenario: Admin navigates to sport selection after login

- **WHEN** a user with role `admin` successfully logs in
- **THEN** the system SHALL navigate to `/admin`
- **THEN** the page SHALL display four sport type cards

#### Scenario: Admin selects 演武 sport

- **WHEN** admin clicks the 演武 card on `/admin`
- **THEN** the system SHALL navigate to `/admin/kata`

#### Scenario: Admin selects a combat sport

- **WHEN** admin clicks 寢技, 對打, or 格鬥 card
- **THEN** the system SHALL navigate to `/admin/matches/ne-waza`, `/admin/matches/fighting`, or `/admin/matches/contact` respectively


<!-- @trace
source: admin-sport-selector
updated: 2026-03-09
code:
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/models/User.ts
  - backend/src/index.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/routes/matchScores.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - backend/src/controllers/matchScoreController.ts
  - docker-compose.yml
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - backend/src/seeds/initialUsers.ts
  - backend/src/models/Match.ts
  - frontend/src/app/app.routes.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/login/login.component.html
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/models/match.model.ts
  - backend/src/models/MatchScoreLog.ts
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
-->

---
### Requirement: All admin routes require admin role

All routes under `/admin/*` SHALL be protected by `roleGuard('admin')`. Unauthenticated or non-admin access SHALL redirect to `/login`.

#### Scenario: Non-admin accesses admin route

- **WHEN** a user without `admin` role navigates to any `/admin/*` route
- **THEN** the system SHALL redirect to `/login`

#### Scenario: Unauthenticated access to admin route

- **WHEN** an unauthenticated user navigates to any `/admin/*` route
- **THEN** the system SHALL redirect to `/login`

<!-- @trace
source: admin-sport-selector
updated: 2026-03-09
code:
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/models/User.ts
  - backend/src/index.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/routes/matchScores.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - backend/src/controllers/matchScoreController.ts
  - docker-compose.yml
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - backend/src/seeds/initialUsers.ts
  - backend/src/models/Match.ts
  - frontend/src/app/app.routes.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/login/login.component.html
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/models/match.model.ts
  - backend/src/models/MatchScoreLog.ts
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
-->