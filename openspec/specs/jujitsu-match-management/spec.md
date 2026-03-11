# jujitsu-match-management Specification

## Purpose

TBD - created by archiving change 'add-ne-waza-scoring'. Update Purpose after archive.

## Requirements

### Requirement: Admin can create matches via CSV/Excel import

The system SHALL allow Admin to import match schedules by uploading a CSV or Excel file through the Admin dashboard.

The import file SHALL contain the following columns: `matchType`, `category`, `weightClass`, `round`, `scheduledOrder`, `redPlayerName`, `redTeamName`, `bluePlayerName`, `blueTeamName`.

Valid values for `matchType` SHALL be: `ne-waza`, `fighting`, `contact`.

Valid values for `category` SHALL be: `male`, `female`, `mixed`.

The system SHALL POST the parsed records to `POST /api/v1/matches/bulk` and create one `Match` document per record.

#### Scenario: Successful import

- **WHEN** Admin uploads a valid CSV file with 8 ne-waza matches
- **THEN** the system creates 8 Match documents with `status: 'pending'`
- **AND** displays a success toast with the count of imported matches

#### Scenario: Invalid matchType in CSV

- **WHEN** Admin uploads a CSV containing an unrecognized `matchType` value (e.g., `wrestling`)
- **THEN** the system SHALL reject that row and report it in the error summary
- **AND** valid rows SHALL still be imported

#### Scenario: Duplicate scheduledOrder within same matchType + category + weightClass + round

- **WHEN** Admin uploads two rows with identical `matchType`, `category`, `weightClass`, `round`, and `scheduledOrder`
- **THEN** the system SHALL reject the duplicate row and report a conflict error


<!-- @trace
source: add-ne-waza-scoring
updated: 2026-03-09
code:
  - docker-compose.yml
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - backend/src/models/User.ts
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - backend/src/models/Match.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - backend/src/index.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/services/auth.service.ts
  - frontend/src/app/app.routes.ts
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/login/login.component.html
  - backend/src/controllers/matchScoreController.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/core/models/match.model.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - backend/src/seeds/initialUsers.ts
  - backend/src/routes/matchScores.ts
-->

---
### Requirement: Admin can create individual matches manually

The system SHALL allow Admin to create a single match via `POST /api/v1/matches` with the required fields.

#### Scenario: Create a single ne-waza match

- **WHEN** Admin POSTs a valid match payload with `matchType: 'ne-waza'`
- **THEN** the system creates a Match document with `status: 'pending'`
- **AND** returns the created match in the response


<!-- @trace
source: add-ne-waza-scoring
updated: 2026-03-09
code:
  - docker-compose.yml
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - backend/src/models/User.ts
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - backend/src/models/Match.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - backend/src/index.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/services/auth.service.ts
  - frontend/src/app/app.routes.ts
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/login/login.component.html
  - backend/src/controllers/matchScoreController.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/core/models/match.model.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - backend/src/seeds/initialUsers.ts
  - backend/src/routes/matchScores.ts
-->

---
### Requirement: Match status transitions follow a strict lifecycle

Each Match document SHALL follow the state machine: `pending` → `in-progress` → `completed`.

The system SHALL NOT allow a match to transition from `completed` back to `in-progress` or `pending` via the referee interface.

Admin SHALL be able to override match status via `PATCH /api/v1/matches/:id` (admin-only).

#### Scenario: Referee starts a pending match

- **WHEN** match_referee selects a `pending` match and clicks start
- **THEN** the system transitions the match to `in-progress`
- **AND** emits `match:started` via Socket.IO to the event room

#### Scenario: Referee attempts to enter a completed match

- **WHEN** match_referee selects a match with `status: 'completed'`
- **THEN** the system SHALL display a locked indicator on that match in the list
- **AND** SHALL NOT allow the referee to enter the scoring interface for that match

#### Scenario: Admin overrides a completed match

- **WHEN** Admin sends `PATCH /api/v1/matches/:id` with `{ status: 'pending' }` and valid admin JWT
- **THEN** the system updates the match status to `pending`


<!-- @trace
source: add-ne-waza-scoring
updated: 2026-03-09
code:
  - docker-compose.yml
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - backend/src/models/User.ts
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - backend/src/models/Match.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - backend/src/index.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/services/auth.service.ts
  - frontend/src/app/app.routes.ts
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/login/login.component.html
  - backend/src/controllers/matchScoreController.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/core/models/match.model.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - backend/src/seeds/initialUsers.ts
  - backend/src/routes/matchScores.ts
-->

---
### Requirement: match_referee role is restricted to match management endpoints

JWT tokens with `role: 'match_referee'` SHALL be accepted by all `/api/v1/matches/*` and `/api/v1/match-scores/*` endpoints.

The system SHALL reject `match_referee` tokens on embu (演武) endpoints: `/api/v1/flow/*`, `/api/v1/scores`, `/api/v1/vr-scores`.

#### Scenario: match_referee accesses match list

- **WHEN** match_referee sends `GET /api/v1/matches?eventId=<id>` with a valid JWT
- **THEN** the system returns the list of matches for that event

#### Scenario: match_referee accesses embu flow endpoint

- **WHEN** match_referee sends `POST /api/v1/flow/open-action` with a valid JWT
- **THEN** the system returns HTTP 403 Forbidden


<!-- @trace
source: add-ne-waza-scoring
updated: 2026-03-09
code:
  - docker-compose.yml
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - backend/src/models/User.ts
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - backend/src/models/Match.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - backend/src/index.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/services/auth.service.ts
  - frontend/src/app/app.routes.ts
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/login/login.component.html
  - backend/src/controllers/matchScoreController.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/core/models/match.model.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - backend/src/seeds/initialUsers.ts
  - backend/src/routes/matchScores.ts
-->

---
### Requirement: Match list is sorted by scheduledOrder

The system SHALL return matches sorted by `scheduledOrder` ascending when queried via `GET /api/v1/matches?eventId=<id>`.

#### Scenario: Retrieve sorted match list

- **WHEN** match_referee requests the match list for an event with 5 matches
- **THEN** the response array is ordered by `scheduledOrder` from lowest to highest

<!-- @trace
source: add-ne-waza-scoring
updated: 2026-03-09
code:
  - docker-compose.yml
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - backend/src/models/User.ts
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - backend/src/models/Match.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - backend/src/index.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/services/auth.service.ts
  - frontend/src/app/app.routes.ts
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/login/login.component.html
  - backend/src/controllers/matchScoreController.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/core/models/match.model.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - backend/src/seeds/initialUsers.ts
  - backend/src/routes/matchScores.ts
-->