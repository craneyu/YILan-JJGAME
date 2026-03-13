# admin-sport-navigation Specification

## Purpose

TBD - created by archiving change 'admin-sport-selector'. Update Purpose after archive.

## Requirements

### Requirement: Admin sees sport selection page after login

After successful login, the admin role SHALL be directed to the event list page at `/admin/events`. The sport selection page SHALL only be accessible after the admin selects a specific event, and SHALL be displayed at `/admin/events/:eventId`. The sport selection page SHALL display the selected event's name as a header, followed by four sport type cards: 演武 (Duo+Show), 寢技 (Ne-Waza), 對打 (Fighting), and 格鬥 (Contact). Each card SHALL navigate to the corresponding management page within the event context when clicked.

#### Scenario: Admin navigates to event list after login

- **WHEN** a user with role `admin` successfully logs in
- **THEN** the system SHALL navigate to `/admin/events`
- **THEN** the page SHALL display the event list (not the sport selection cards)

#### Scenario: Admin enters an event and sees sport selection

- **WHEN** admin navigates to `/admin/events/:eventId`
- **THEN** the page SHALL display the event name as the page header
- **THEN** the page SHALL display four sport type cards: 演武, 寢技, 對打, 格鬥

#### Scenario: Admin selects 演武 sport

- **WHEN** admin clicks the 演武 card on `/admin/events/:eventId`
- **THEN** the system SHALL navigate to `/admin/events/:eventId/kata`

#### Scenario: Admin selects a combat sport

- **WHEN** admin clicks 寢技, 對打, or 格鬥 card on `/admin/events/:eventId`
- **THEN** the system SHALL navigate to `/admin/events/:eventId/matches/ne-waza`, `/admin/events/:eventId/matches/fighting`, or `/admin/events/:eventId/matches/contact` respectively


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
### Requirement: All admin routes require admin role

All routes under `/admin/*` SHALL be protected by `roleGuard('admin')`. Unauthenticated or non-admin access SHALL redirect to `/login`.

#### Scenario: Non-admin accesses admin route

- **WHEN** a user without `admin` role navigates to any `/admin/*` route
- **THEN** the system SHALL redirect to `/login`

#### Scenario: Unauthenticated access to admin route

- **WHEN** an unauthenticated user navigates to any `/admin/*` route
- **THEN** the system SHALL redirect to `/login`

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
