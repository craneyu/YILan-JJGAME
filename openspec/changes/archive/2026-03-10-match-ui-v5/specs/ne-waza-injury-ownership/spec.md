## MODIFIED Requirements

### Requirement: Injury timeout with side ownership

The system SHALL support injury timeouts attributed to a specific player side (`red` or `blue`).

The referee interface SHALL provide separate injury timeout buttons for each side (red and blue player sections).

The injury timeout indicator SHALL be rendered as a CSS-only element (a red rounded square with a white bold "+" character) instead of a Font Awesome icon. This applies to both the referee interface and the audience scoreboard.

The initial injury time limit SHALL be determined by the match duration:
- Matches with `matchDuration === 180` (格鬥, 3-minute match): **180 seconds**
- All other matches (寢技 and 對打, 2-minute match): **120 seconds**

The injury time limit SHALL be set once when the match becomes active. It SHALL NOT reset between injury timeouts within the same match.

When an injury timeout is started, the system SHALL broadcast an `injury:started` socket event with payload `{ eventId, matchId, side: 'red' | 'blue', durationSec: number }`.

When an injury timeout ends (timer expires or referee resumes), the system SHALL broadcast an `injury:ended` socket event with payload `{ eventId, matchId, side: 'red' | 'blue' }`.

#### Scenario: Referee starts injury timeout for red player

- **WHEN** referee taps the injury timeout button in the red player section
- **THEN** the match timer SHALL pause
- **THEN** an injury countdown SHALL start for the red side from the current remaining injury time (not from the initial limit)
- **THEN** an `injury:started` socket event SHALL be broadcast with `side: 'red'`

#### Scenario: Referee starts injury timeout for blue player

- **WHEN** referee taps the injury timeout button in the blue player section
- **THEN** the match timer SHALL pause
- **THEN** an injury countdown SHALL start for the blue side from the current remaining injury time
- **THEN** an `injury:started` socket event SHALL be broadcast with `side: 'blue'`

#### Scenario: Injury timeout ends by referee resuming

- **WHEN** the referee taps the resume button after an injury timeout
- **THEN** the injury countdown SHALL pause (stop decrementing)
- **THEN** an `injury:ended` socket event SHALL be broadcast with the corresponding `side`
- **THEN** the match timer SHALL resume if no other side has an active injury timeout

#### Scenario: Second injury timeout resumes from remaining time

- **WHEN** a player starts a second injury timeout after a previous one was ended
- **THEN** the injury countdown SHALL resume from the remaining time of the previous timeout
- **THEN** the countdown SHALL NOT reset to the initial limit

#### Scenario: Injury timeout limit reached

- **WHEN** a player's injury countdown reaches zero
- **THEN** the injury countdown SHALL stop at zero
- **THEN** the injury timeout button for that side SHALL be disabled (no further injury timeouts allowed)

## MODIFIED Requirements

### Requirement: Injury timeout display in audience scoreboard

The audience scoreboard SHALL display an injury timeout indicator inside the affected player's row when an injury timeout is active OR when an injury timeout has previously been used (remaining time is less than the initial limit).

The indicator SHALL show the remaining injury time in MM:SS format.

The indicator SHALL remain visible after the injury timeout ends, showing the paused remaining time, so players and audience know how much time is available for the next timeout.

The indicator SHALL only be hidden when no injury timeout has ever been started for that side in the current match.

The indicator icon SHALL be a CSS-only red rounded square with a white bold "+" character, not a Font Awesome icon.

#### Scenario: Audience sees red player injury timeout

- **WHEN** an `injury:started` event with `side: 'red'` is received on the audience display
- **THEN** a countdown indicator SHALL appear inside the red player's row
- **THEN** the countdown SHALL decrement every second
- **THEN** the indicator SHALL use a CSS-only red "+" square instead of a Font Awesome icon

#### Scenario: Injury timeout indicator persists after timeout ends

- **WHEN** an `injury:ended` event is received
- **THEN** the countdown indicator for the corresponding side SHALL remain visible
- **THEN** the indicator SHALL show the paused remaining time (no longer decrementing)

#### Scenario: Injury timeout indicator hidden at match start

- **WHEN** a match becomes active and no injury timeout has been started yet
- **THEN** no injury timeout indicator SHALL be shown for either side
