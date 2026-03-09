# audience-sport-selector Specification

## Purpose

TBD - created by archiving change 'audience-sport-selector-and-submission-scoring'. Update Purpose after archive.

## Requirements

### Requirement: Audience sport selector entry page

The system SHALL provide a unified audience entry page at `/audience-select` that automatically detects the active event and presents sport selection options.

The page SHALL be accessible without authentication (no route guard).

#### Scenario: Active event found

- **WHEN** the page loads and `GET /api/v1/events?open=true` returns one or more events
- **THEN** the system SHALL use the first event in the list as the active event and display five sport selection cards

#### Scenario: No active event

- **WHEN** the page loads and `GET /api/v1/events?open=true` returns an empty array
- **THEN** the system SHALL display a message indicating no competition is currently in progress and SHALL NOT show any sport selection cards


<!-- @trace
source: audience-sport-selector-and-submission-scoring
updated: 2026-03-09
code:
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/models/User.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.ts
  - frontend/src/app/core/models/match.model.ts
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/app.routes.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - backend/src/seeds/initialUsers.ts
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.html
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - backend/src/models/Match.ts
  - backend/src/controllers/matchScoreController.ts
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/admin/admin.component.html
  - docker-compose.yml
  - backend/src/routes/matchScores.ts
  - frontend/src/app/features/login/login.component.html
  - backend/src/controllers/matchController.ts
  - backend/src/index.ts
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - backend/src/routes/creativeFlow.ts
  - frontend/src/app/app.config.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
-->

---
### Requirement: Sport selection navigation

The system SHALL display exactly five sport cards with the following navigation targets when an active event is detected:

| Sport | Route |
|-------|-------|
| 演武 (Kata) | `/audience?eventId=<activeEventId>` |
| 創意演武 (Creative Embu) | `/creative/audience?eventId=<activeEventId>` |
| 寢技 (Ne-Waza) | `/match-audience?matchType=ne-waza&eventId=<activeEventId>` |
| 對打 (Fighting) | `/match-audience?matchType=fighting&eventId=<activeEventId>` |
| 格鬥 (Contact) | `/match-audience?matchType=contact&eventId=<activeEventId>` |

#### Scenario: Selecting a sport

- **WHEN** the audience clicks a sport card
- **THEN** the system SHALL navigate to the corresponding audience view with `eventId` as a query parameter


<!-- @trace
source: audience-sport-selector-and-submission-scoring
updated: 2026-03-09
code:
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/models/User.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.ts
  - frontend/src/app/core/models/match.model.ts
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/app.routes.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - backend/src/seeds/initialUsers.ts
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.html
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - backend/src/models/Match.ts
  - backend/src/controllers/matchScoreController.ts
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/admin/admin.component.html
  - docker-compose.yml
  - backend/src/routes/matchScores.ts
  - frontend/src/app/features/login/login.component.html
  - backend/src/controllers/matchController.ts
  - backend/src/index.ts
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - backend/src/routes/creativeFlow.ts
  - frontend/src/app/app.config.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
-->

---
### Requirement: Audience role login redirect

The system SHALL redirect users with the `audience` role to `/audience-select` after successful login.

#### Scenario: Audience login

- **WHEN** a user with `audience` role successfully logs in
- **THEN** the system SHALL navigate to `/audience-select` instead of `/audience`


<!-- @trace
source: audience-sport-selector-and-submission-scoring
updated: 2026-03-09
code:
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/models/User.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.ts
  - frontend/src/app/core/models/match.model.ts
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/app.routes.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - backend/src/seeds/initialUsers.ts
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.html
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - backend/src/models/Match.ts
  - backend/src/controllers/matchScoreController.ts
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/admin/admin.component.html
  - docker-compose.yml
  - backend/src/routes/matchScores.ts
  - frontend/src/app/features/login/login.component.html
  - backend/src/controllers/matchController.ts
  - backend/src/index.ts
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - backend/src/routes/creativeFlow.ts
  - frontend/src/app/app.config.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
-->

---
### Requirement: Match audience dynamic matchType

The `match-audience` component SHALL read `matchType` from the route query parameters instead of using a hardcoded value.

#### Scenario: matchType provided via URL

- **WHEN** the user navigates to `/match-audience?matchType=fighting&eventId=xxx`
- **THEN** the component SHALL load matches filtered by `matchType=fighting`

#### Scenario: matchType not provided

- **WHEN** the user navigates to `/match-audience` without a `matchType` parameter
- **THEN** the component SHALL default to `matchType=ne-waza` for backward compatibility

<!-- @trace
source: audience-sport-selector-and-submission-scoring
updated: 2026-03-09
code:
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/models/User.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.ts
  - frontend/src/app/core/models/match.model.ts
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/app.routes.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - backend/src/seeds/initialUsers.ts
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.html
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - backend/src/models/Match.ts
  - backend/src/controllers/matchScoreController.ts
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/admin/admin.component.html
  - docker-compose.yml
  - backend/src/routes/matchScores.ts
  - frontend/src/app/features/login/login.component.html
  - backend/src/controllers/matchController.ts
  - backend/src/index.ts
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - backend/src/routes/creativeFlow.ts
  - frontend/src/app/app.config.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
-->