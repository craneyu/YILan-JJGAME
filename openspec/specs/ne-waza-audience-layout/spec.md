## ADDED Requirements

### Requirement: Ne-Waza audience scoreboard two-row layout

The audience scoreboard SHALL display two player rows stacked vertically (red on top, blue below), followed by a timer row at the bottom.

Each player row SHALL contain:
- Left section: player name in large bold white text
- Center section: two labeled values — 優勢 (advantage) and 警告 (penalty/warning), each with a small grey label above the number
- Right section: a solid color block (red for red player, blue for blue player) containing the score in large white bold text

The timer row SHALL display the match timer right-aligned in large grey monospace text.

The overall background SHALL use a near-black dark color (`bg-gray-950`).

#### Scenario: Active match is displayed

- **WHEN** an active match exists
- **THEN** the scoreboard SHALL render two rows (red player top, blue player bottom)
- **THEN** each row SHALL show the player name, 優勢 count, 警告 count, and score in the correct sections

#### Scenario: Score updates in real-time

- **WHEN** a `match:score-updated` socket event is received
- **THEN** the affected player's score, 優勢, and 警告 values SHALL update immediately without page reload

#### Scenario: No active match

- **WHEN** no active match exists
- **THEN** a waiting message SHALL be displayed instead of the scoreboard rows

### Requirement: Match result display

When a match result is determined, the losing player's row SHALL dim (reduced opacity) and a winner banner SHALL appear.

#### Scenario: Red player wins

- **WHEN** a match result event is received with `winner: 'red'`
- **THEN** the blue player row SHALL have reduced opacity
- **THEN** a winner indicator SHALL be visible


<!-- @trace
source: referee-scoring-fixes
updated: 2026-03-09
code:
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - backend/src/seeds/initialUsers.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/login/login.component.ts
  - docker-compose.yml
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.html
  - backend/src/controllers/matchScoreController.ts
  - backend/src/models/User.ts
  - frontend/src/app/features/admin/admin.component.html
  - backend/src/routes/matchScores.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - backend/src/index.ts
  - backend/src/models/Match.ts
  - frontend/src/app/core/services/auth.service.ts
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - frontend/src/app/core/models/match.model.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/app.routes.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - backend/src/routes/matches.ts
  - SPEC/SPEC-v4.md
  - backend/src/controllers/matchController.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/features/login/login.component.html
  - frontend/src/app/app.config.ts
  - backend/src/routes/creativeFlow.ts
-->

### Requirement: Timer display in audience view

The match timer SHALL be displayed in the bottom section of the scoreboard, right-aligned, in large grey monospace font.

When the timer is paused, it SHALL show a visual indicator (e.g., reduced opacity).

When 30 seconds or less remain and the timer is running, the timer text SHALL change to red.

#### Scenario: Timer countdown

- **WHEN** the timer is running and has more than 30 seconds remaining
- **THEN** the timer SHALL display in grey/white color

#### Scenario: Timer critical

- **WHEN** the timer is running and 30 seconds or fewer remain
- **THEN** the timer text SHALL change to red

## Requirements
