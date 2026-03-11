# Spec: ne-waza-scoring

## Purpose

Defines requirements for the `match_referee` Ne-Waza (寢技) scoring interface: match selection, timer control, real-time score recording, warning system, injury timeout, DQ, and match result submission.

## ADDED Requirements

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

---

### Requirement: Referee records Ne-Waza scores per side

The scoring interface SHALL display two columns: red side (紅方) and blue side (藍方).

Each side SHALL show: team name, player name, current score total, current advantage count, and warning count.

Each side SHALL provide score buttons: [2分], [3分], [4分], [優勢], [降伏勝], and an undo button [↩ 取消上一筆].

Clicking a score button SHALL:
1. Increment the corresponding side's score by the button value
2. Create a `MatchScoreLog` entry via `POST /api/v1/match-scores`
3. Emit `match:score-updated` via Socket.IO

[降伏勝] SHALL immediately end the match, set the winner to that side, and emit `match:ended`.

The undo button [↩ 取消上一筆] SHALL only affect that side's own last score log entry. It SHALL NOT affect the opponent's score log.

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

#### Scenario: Submission win for blue

- **WHEN** referee clicks [降伏勝] in the blue column
- **THEN** blue score is set to 99
- **AND** the match immediately ends with `result: { winner: 'blue', method: 'submission' }`
- **AND** `match:ended` is emitted

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
