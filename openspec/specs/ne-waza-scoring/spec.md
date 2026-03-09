# ne-waza-scoring Specification

## Purpose

TBD - created by archiving change 'add-ne-waza-scoring'. Update Purpose after archive.

## Requirements

### Requirement: match_referee sees a match selection list

The system SHALL display all matches for the current event to the `match_referee` after login, sorted by `scheduledOrder`.

Each match row SHALL display: match number, match type, category, weight class, red player name, blue player name, and status badge.

Matches with `status: 'completed'` SHALL display a lock icon and SHALL NOT be selectable.

Matches with `status: 'in-progress'` SHALL display a highlighted badge and SHALL be selectable to resume.

#### Scenario: View pending and completed matches

- **WHEN** match_referee loads the match list with 3 pending and 2 completed matches
- **THEN** all 5 matches are displayed in scheduledOrder
- **AND** the 2 completed matches show a lock icon and are not clickable

#### Scenario: Select a pending match

- **WHEN** match_referee clicks a `pending` match row
- **THEN** the view transitions to the Ne-Waza scoring interface for that match
- **AND** the system sends `PATCH /api/v1/matches/:id` with `{ status: 'in-progress' }`


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
### Requirement: Timer controls are available before and during match

Before the match starts, the referee SHALL be able to select a duration via quick-select buttons: 2 min, 3 min, 5 min, 6 min.

The default duration for Ne-Waza SHALL be 6 minutes.

During a paused match, the referee SHALL be able to adjust remaining time using ▲/▼ controls for minutes (0–99) and seconds (0–59).

The timer SHALL count down from the set duration when started.

When timer reaches 00:00, the system SHALL pause and prompt the referee to confirm the match result.

#### Scenario: Start timer with default duration

- **WHEN** referee enters the Ne-Waza scoring interface
- **THEN** the timer displays 06:00 and a start button is visible

#### Scenario: Adjust time during pause

- **WHEN** referee pauses the timer and adjusts minutes ▲ to add 1 minute
- **THEN** the remaining time increases by 60 seconds
- **WHEN** referee clicks "儲存並繼續"
- **THEN** the timer resumes from the adjusted time

#### Scenario: Timer expires

- **WHEN** the countdown reaches 00:00
- **THEN** the timer stops automatically
- **AND** the result confirmation buttons (紅方勝 / 藍方勝) become prominently highlighted


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
### Requirement: Referee records Ne-Waza scores per side

The scoring interface SHALL display two columns: red side (紅方) and blue side (藍方).

Each side SHALL show: team name, player name, current score total, current advantage count, and warning count.

Each side SHALL provide score buttons: [2分], [3分], [4分], [優勢], [降伏勝], and an undo button [↩ 取消上一筆].

Clicking a score button SHALL:
1. Increment the corresponding side's score by the button value
2. Create a `MatchScoreLog` entry via `POST /api/v1/match-scores`
3. Emit `match:score-updated` via Socket.IO

[降伏勝] SHALL enter a pending confirmation state (`submissionPending`) rather than immediately ending the match. The match ends only when the referee confirms the submission.

The undo button [↩ 取消上一筆] SHALL only affect that side's own last score log entry. It SHALL NOT affect the opponent's score log.

When [↩ 取消上一筆] removes a score log entry with value 99 (降伏勝 pending), the `submissionPending` state SHALL be cleared simultaneously.

#### Scenario: Record a 3-point score for red

- **WHEN** referee clicks [3分] in the red column
- **THEN** red score increments by 3
- **AND** a score log entry `{ side: 'red', type: 'score', value: 3 }` is persisted
- **AND** `match:score-updated` is emitted with updated red score

#### Scenario: Undo last red score

- **WHEN** referee clicks [↩ 取消上一筆] in the red column after a previous 3-point entry
- **THEN** red score decrements by 3
- **AND** a score log entry `{ side: 'red', type: 'undo', value: -3 }` is persisted
- **AND** blue score remains unchanged

#### Scenario: Undo submission pending clears state

- **WHEN** referee clicks [降伏勝] for a side (entering pending state)
- **AND** referee then clicks [↩ 取消上一筆] for the same side
- **THEN** the score log entry with value 99 SHALL be removed
- **AND** the `submissionPending` state SHALL be cleared
- **AND** the [降伏勝] confirmation UI SHALL no longer be shown


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

---
### Requirement: Warning system follows cumulative rules

Each side SHALL have a warning counter initialized at 0.

[+警告] SHALL increment that side's warning count by 1.

[-警告] SHALL decrement that side's warning count by 1 (minimum 0).

The system SHALL automatically apply advantages to the opponent based on warning count:

| Warning count | Automatic effect |
|---------------|-----------------|
| 1 | Record only |
| 2 | +1 advantage to opponent (auto) |
| 3 | +1 advantage to opponent (auto, cumulative +2) |
| 4 | Opponent wins (requires referee confirmation) |

When [-警告] reverses a warning that had triggered an automatic advantage, the system SHALL also decrement the opponent's advantage count by 1 and display a confirmation prompt.

#### Scenario: Second warning triggers opponent advantage

- **WHEN** referee clicks [+警告] for red for the second time
- **THEN** red warning count becomes 2
- **AND** blue advantage count automatically increments by 1
- **AND** a toast notification informs the referee of the automatic advantage

#### Scenario: Fourth warning ends match

- **WHEN** referee clicks [+警告] for red for the fourth time
- **THEN** system displays a confirmation dialog: "紅方第4次警告，藍方獲勝，確認結束場次？"
- **WHEN** referee confirms
- **THEN** match ends with `result: { winner: 'blue', method: 'judge' }`

#### Scenario: Undo warning that triggered advantage

- **WHEN** referee clicks [-警告] for red when red has 2 warnings (which had auto-given blue +1 advantage)
- **THEN** system displays a confirmation: "取消此警告將同步扣除藍方1優勢，確認？"
- **WHEN** referee confirms
- **THEN** red warning count becomes 1 and blue advantage count decrements by 1


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
### Requirement: Injury timeout suspends match timer

Each side SHALL have a [+傷停] button.

Clicking [+傷停] SHALL:
1. Pause the main match timer
2. Start a 2-minute injury countdown
3. Display an overlay showing "⚠ 傷停處理中" with the countdown

When the injury countdown reaches 00:00, the system SHALL display a prompt to resume.

The referee SHALL be able to end the injury timeout early by clicking [繼續比賽].

The system SHALL record each injury timeout instance with start and end timestamps in the match log.

#### Scenario: Trigger injury timeout

- **WHEN** referee clicks [+傷停] for blue
- **THEN** the main timer pauses
- **AND** an overlay appears with a 2-minute countdown

#### Scenario: Resume after injury timeout

- **WHEN** referee clicks [繼續比賽] during injury timeout
- **THEN** the injury overlay disappears
- **AND** the main match timer resumes from where it was paused


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
### Requirement: DQ immediately ends match with confirmation

Each side SHALL have a [DQ] button.

Clicking [DQ] SHALL display a confirmation dialog: "確認 [紅方/藍方] 嚴重犯規 (DQ)？此操作無法復原。"

Upon confirmation, the match SHALL end with the DQ'd side as loser and the opponent auto-advancing to the next round.

The referee SHALL be able to enter a freetext reason for the DQ, which SHALL be stored in the match document.

#### Scenario: DQ red player

- **WHEN** referee clicks [DQ] in red column and confirms
- **THEN** match ends with `result: { winner: 'blue', method: 'dq' }`
- **AND** the match status becomes `completed`


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
### Requirement: Referee confirms final match result

After timer expiry (or at any point), the referee SHALL be able to click [紅方勝] or [藍方勝] to finalize the result.

Clicking either button SHALL display a confirmation dialog before finalizing.

Upon confirmation:
1. Match `status` SHALL be set to `completed`
2. Match `result` SHALL be persisted via `PATCH /api/v1/matches/:id`
3. `match:ended` SHALL be emitted via Socket.IO
4. The view SHALL return to the match selection list

#### Scenario: Judge declares red wins

- **WHEN** referee clicks [紅方勝] and confirms
- **THEN** match is saved with `result: { winner: 'red', method: 'judge' }`
- **AND** the match list view is shown with the match marked as completed

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
### Requirement: Ne-Waza scoring button layout

The referee scoring panel SHALL display buttons in two rows per side (red / blue).

- Positive row (green): `+2`, `+3`, `+4`, `+A 優勢`, `+P 警告`, `STALLING`
- Negative row (red): `-2`, `-3`, `-4`, `-A 優勢`, `-P 警告`

The panel SHALL NOT display `+1` or `-1` buttons (1-point scores do not exist in Ne-Waza rules).

Each button label SHALL include a Chinese subtitle:
- `+A` / `-A` → displayed as `+A 優勢` / `-A 優勢`
- `+P` / `-P` → displayed as `+P 警告` / `-P 警告`

All score buttons in the positive and negative rows SHALL have a uniform fixed size: minimum width `3.5rem` and height `3rem` (equivalent to Tailwind `min-w-[3.5rem] h-12`), ensuring that single-line buttons (`+2`, `-2`) and double-line buttons (`+A 優勢`, `-A 優勢`) are visually equal in size.

The bottom action row (containing 降伏勝, DQ, 傷停, 取消上一筆) SHALL be aligned with the negative row buttons using the same left padding (`pl-12`).

#### Scenario: Referee taps +A on red side

- **WHEN** referee taps the `+A 優勢` button in the red side positive row
- **THEN** red player's advantage count SHALL increment by 1

#### Scenario: Referee taps -P on blue side

- **WHEN** referee taps the `-P 警告` button in the blue side negative row
- **THEN** blue player's warning count SHALL decrement by 1 (minimum 0)

#### Scenario: +1 button is absent

- **WHEN** referee opens the scoring view
- **THEN** no `+1` or `-1` button SHALL be visible in either side's scoring area

#### Scenario: Score buttons are uniform size

- **WHEN** referee views a scoring card
- **THEN** all score buttons (+2, +3, +4, +A優勢, +P警告, STALLING, -2, -3, -4, -A優勢, -P警告) SHALL have the same minimum width and the same height

#### Scenario: Bottom row aligns with negative row

- **WHEN** referee views a scoring card
- **THEN** the [降伏勝] button in the bottom action row SHALL be horizontally aligned with the [-2] button in the negative row above it


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

---
### Requirement: STALLING per-side button

Each side (red / blue) SHALL have its own `STALLING` button in the positive row.

Tapping `STALLING` for a side SHALL increment that side's warning count by 1 (equivalent to `+P 警告`).

The button SHALL be visually distinct using orange / amber color to differentiate from regular penalty.

#### Scenario: Referee calls STALLING on blue

- **WHEN** referee taps `STALLING` in the blue side positive row
- **THEN** blue player's warning count SHALL increment by 1
- **THEN** the warning count displayed for blue SHALL reflect the new value immediately

<!-- @trace
source: ne-waza-scoring-ui-redesign
updated: 2026-03-09
code:
  - frontend/src/app/features/admin/admin.component.html
  - backend/src/index.ts
  - frontend/src/app/app.routes.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.html
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - frontend/src/app/features/login/login.component.html
  - backend/src/seeds/initialUsers.ts
  - SPEC/SPEC-v4.md
  - backend/src/controllers/matchScoreController.ts
  - docker-compose.yml
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - backend/src/models/Match.ts
  - backend/src/routes/matchScores.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/core/services/auth.service.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - backend/src/models/User.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/routes/creativeFlow.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/core/models/match.model.ts
  - backend/src/controllers/matchController.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/app.config.ts
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - backend/src/routes/matches.ts
-->

---
### Requirement: Referee scoring card bottom row layout

Each player scoring card SHALL display a single bottom action row containing, in order: Submission Win, DQ, Injury Timeout, and Undo Last.

The DQ button SHALL appear immediately after the Submission Win button.

The Injury Timeout button SHALL appear after the DQ button, and Undo Last SHALL be the last button in the row.

#### Scenario: Bottom action row is displayed

- **WHEN** the referee views a player's scoring card
- **THEN** the bottom row SHALL contain Submission Win, DQ, Injury Timeout, and Undo Last buttons in that order
- **THEN** all four actions SHALL be visible in a single horizontal flex row


<!-- @trace
source: referee-ui-improvements
updated: 2026-03-09
code:
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - frontend/src/app/core/models/match.model.ts
  - backend/src/routes/creativeFlow.ts
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/seeds/initialUsers.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.html
  - backend/src/index.ts
  - backend/src/controllers/matchScoreController.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - backend/src/models/Match.ts
  - backend/src/models/User.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - backend/src/routes/matchScores.ts
  - frontend/src/app/features/login/login.component.html
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - backend/src/routes/matches.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/sockets/index.ts
  - docker-compose.yml
  - frontend/src/app/app.routes.ts
-->

---
### Requirement: Injury timeout button icon

The injury timeout button SHALL use the FontAwesome `faPlus` icon instead of an emoji.

#### Scenario: Injury button displays plus icon

- **WHEN** the referee views the injury timeout button in either player's card
- **THEN** the button SHALL display a `faPlus` FontAwesome icon

<!-- @trace
source: referee-ui-improvements
updated: 2026-03-09
code:
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - frontend/src/app/core/models/match.model.ts
  - backend/src/routes/creativeFlow.ts
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/seeds/initialUsers.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.html
  - backend/src/index.ts
  - backend/src/controllers/matchScoreController.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - backend/src/models/Match.ts
  - backend/src/models/User.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - backend/src/routes/matchScores.ts
  - frontend/src/app/features/login/login.component.html
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - backend/src/routes/matches.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/features/audience-sport-selector/audience-sport-selector.component.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/sockets/index.ts
  - docker-compose.yml
  - frontend/src/app/app.routes.ts
-->