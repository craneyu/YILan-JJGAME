# match-scoring Specification

## Purpose

TBD - created by archiving change 'audience-sport-selector-and-submission-scoring'. Update Purpose after archive.

## Requirements

### Requirement: Submission scoring value

When a referee registers a submission (降伏), the winning side SHALL receive 99 points to represent a technical victory.

The submission SHALL NOT automatically end the match. The referee MUST manually confirm the winner by pressing the red-wins or blue-wins button before the match is ended.

#### Scenario: Submission registered

- **WHEN** the referee presses the submission button for a side
- **THEN** the system SHALL record 99 points for that side
- **THEN** the system SHALL pause the match timer
- **THEN** the system SHALL display a toast notification indicating submission is pending confirmation
- **THEN** the match status SHALL remain in-progress

#### Scenario: Winner confirmed after submission

- **WHEN** a submission is pending and the referee presses the red-wins or blue-wins confirmation button
- **THEN** the system SHALL end the match with `method: "submission"`
- **THEN** the system SHALL broadcast the match-ended event to all audience clients

#### Scenario: Submission pending state persists until confirmed

- **WHEN** a submission has been registered but not yet confirmed
- **THEN** the referee interface SHALL clearly indicate that a submission is pending
- **THEN** all scoring controls SHALL remain accessible for corrections if needed

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