## ADDED Requirements

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

### Requirement: All admin routes require admin role

All routes under `/admin/*` SHALL be protected by `roleGuard('admin')`. Unauthenticated or non-admin access SHALL redirect to `/login`.

#### Scenario: Non-admin accesses admin route

- **WHEN** a user without `admin` role navigates to any `/admin/*` route
- **THEN** the system SHALL redirect to `/login`

#### Scenario: Unauthenticated access to admin route

- **WHEN** an unauthenticated user navigates to any `/admin/*` route
- **THEN** the system SHALL redirect to `/login`
