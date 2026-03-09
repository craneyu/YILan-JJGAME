# match-audience-display Specification

## Purpose

TBD - created by archiving change 'add-ne-waza-scoring'. Update Purpose after archive.

## Requirements

### Requirement: Audience display is publicly accessible without authentication

The `/match-audience` route SHALL be accessible without a JWT token.

The audience page SHALL join the Socket.IO event room using the `eventId` query parameter.

#### Scenario: Access audience display without login

- **WHEN** a browser navigates to `/match-audience?eventId=<id>`
- **THEN** the page loads without redirecting to login
- **AND** the page joins the Socket.IO room for that eventId


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
### Requirement: Audience display shows current match information

The display SHALL show the following when a match is in progress:

- Match type label (寢技 Ne-Waza / 對打 Fighting / 格鬥 Contact)
- Category and weight class (e.g., 男子組 · -62公斤級)
- Red side: team name, player name, score, advantage count
- Blue side: team name, player name, score, advantage count
- Match timer (remaining time, counting down)
- Status indicator: 進行中 / 暫停中 / 傷停處理中

When no match is in progress, the display SHALL show a waiting screen: "等待下一場比賽"

#### Scenario: Display updates when score is recorded

- **WHEN** match_referee records a 4-point score for red
- **THEN** within 1 second, the audience display shows red score incremented by 4

#### Scenario: Display shows waiting state

- **WHEN** no match has `status: 'in-progress'` in the current event
- **THEN** the audience display shows "等待下一場比賽"


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
### Requirement: Audience display receives socket events for real-time updates

The display SHALL listen to the following Socket.IO events on the event room:

- `match:score-updated` → update red/blue scores, advantages, warnings displayed
- `match:timer-updated` → update the countdown timer display
- `match:ended` → show winner banner and stop timer

#### Scenario: Score update received

- **WHEN** `match:score-updated` is received with `{ matchId, side: 'blue', scores: { blue: 7 } }`
- **THEN** the blue score display updates to 7

#### Scenario: Match ended event received

- **WHEN** `match:ended` is received with `{ winner: 'red', method: 'submission' }`
- **THEN** a prominent winner banner appears: "🏆 紅方勝 (降伏勝)"
- **AND** the timer stops


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
### Requirement: Audience display supports fullscreen mode

The display SHALL provide a fullscreen toggle button that hides browser UI (address bar, tabs) for dedicated display screen use.

#### Scenario: Enter fullscreen

- **WHEN** user clicks the fullscreen button
- **THEN** the page enters browser fullscreen mode via the Fullscreen API
- **AND** the button icon toggles to a compress icon

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