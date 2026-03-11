## ADDED Requirements

### Requirement: Ne-Waza scoring button layout

The referee scoring panel SHALL display buttons in two rows per side (red / blue).

- Positive row (green): `+2`, `+3`, `+4`, `+A 優勢`, `+P 警告`, `STALLING`
- Negative row (red): `-2`, `-3`, `-4`, `-A 優勢`, `-P 警告`

The panel SHALL NOT display `+1` or `-1` buttons (1-point scores do not exist in Ne-Waza rules).

Each button label SHALL include a Chinese subtitle:
- `+A` / `-A` → displayed as `+A 優勢` / `-A 優勢`
- `+P` / `-P` → displayed as `+P 警告` / `-P 警告`

#### Scenario: Referee taps +A on red side

- **WHEN** referee taps the `+A 優勢` button in the red side positive row
- **THEN** red player's advantage count SHALL increment by 1

#### Scenario: Referee taps -P on blue side

- **WHEN** referee taps the `-P 警告` button in the blue side negative row
- **THEN** blue player's warning count SHALL decrement by 1 (minimum 0)

#### Scenario: +1 button is absent

- **WHEN** referee opens the scoring view
- **THEN** no `+1` or `-1` button SHALL be visible in either side's scoring area

### Requirement: STALLING per-side button

Each side (red / blue) SHALL have its own `STALLING` button in the positive row.

Tapping `STALLING` for a side SHALL increment that side's warning count by 1 (equivalent to `+P 警告`).

The button SHALL be visually distinct using orange / amber color to differentiate from regular penalty.

#### Scenario: Referee calls STALLING on blue

- **WHEN** referee taps `STALLING` in the blue side positive row
- **THEN** blue player's warning count SHALL increment by 1
- **THEN** the warning count displayed for blue SHALL reflect the new value immediately
