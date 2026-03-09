## MODIFIED Requirements

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
