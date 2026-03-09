# Spec: match-audience-display

## Purpose

Defines requirements for the public real-time scoreboard (`match-audience`) that displays live match scores, timer, and result for Ne-Waza (and future match types) via Socket.IO.

## ADDED Requirements

### Requirement: Audience display is publicly accessible without authentication

The `/match-audience` route SHALL be accessible without a JWT token.

The audience page SHALL join the Socket.IO event room using the `eventId` query parameter.

#### Scenario: Access audience display without login

- **WHEN** a browser navigates to `/match-audience?eventId=<id>`
- **THEN** the page loads without redirecting to login
- **AND** the page joins the Socket.IO room for that eventId

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

---

### Requirement: Audience display supports fullscreen mode

The display SHALL provide a fullscreen toggle button that hides browser UI (address bar, tabs) for dedicated display screen use.

#### Scenario: Enter fullscreen

- **WHEN** user clicks the fullscreen button
- **THEN** the page enters browser fullscreen mode via the Fullscreen API
- **AND** the button icon toggles to a compress icon
