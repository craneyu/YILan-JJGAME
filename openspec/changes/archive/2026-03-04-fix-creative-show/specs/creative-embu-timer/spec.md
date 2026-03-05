## MODIFIED Requirements

### Requirement: Sequence judge controls the performance timer

The sequence judge interface SHALL provide controls to start, pause/resume, and reset the timer. Pressing the Start button begins the timer; the Space key SHALL toggle between pause and resume while the timer is active. A separate Reset button SHALL reset elapsed time to zero without requiring the timer to be running.

#### Scenario: Timer started from zero

- **WHEN** the sequence judge presses the Start button while the timer is stopped and elapsed is 0
- **THEN** the system SHALL record `timerStartedAt` (current ISO timestamp) in `/creative_game_states` and broadcast a `timer:started` Socket.IO event with `{ eventId, startedAt: ISOString, elapsedMs: 0 }`

#### Scenario: Timer paused

- **WHEN** the sequence judge presses the Stop/Pause button (or Space key) while the timer is running
- **THEN** the system SHALL record `timerPausedAt` and compute `timerElapsedMs` = Date.now() − timerStartedAt + previousElapsedMs, update `/creative_game_states` with `timerElapsedMs` and `timerStatus: 'paused'`, and broadcast a `timer:stopped` event with `{ eventId, elapsedMs: number }`

#### Scenario: Timer resumed after pause

- **WHEN** the sequence judge presses the Resume button (or Space key) while the timer is paused
- **THEN** the system SHALL set a new `timerStartedAt` = now, preserve existing `timerElapsedMs` as the base offset, update `timerStatus: 'running'`, and broadcast a `timer:started` event with `{ eventId, startedAt: ISOString, elapsedMs: currentElapsedMs }`

#### Scenario: Timer reset

- **WHEN** the sequence judge presses the Reset button
- **THEN** the system SHALL set `timerElapsedMs: 0`, `timerStatus: 'idle'`, clear `timerStartedAt` and `timerPausedAt` in `/creative_game_states`, and broadcast a `timer:stopped` event with `{ eventId, elapsedMs: 0 }`

#### Scenario: Space key toggles pause/resume

- **WHEN** the sequence judge presses the Space key while the timer view is active
- **THEN** the system SHALL behave identically to pressing the Pause or Resume button depending on current timer status

## ADDED Requirements

### Requirement: Timer display computed from timestamp, not interval increment

The frontend timer display SHALL compute elapsed time from `timerStartedAt` (a Date value) plus any previously accumulated `timerElapsedMs`, rather than blindly incrementing a counter. This ensures the display is accurate after page refresh and prevents NaN rendering.

#### Scenario: Timer display correct after page load

- **WHEN** the sequence judge's page loads and the timer is already running
- **THEN** the displayed elapsed time SHALL equal floor((Date.now() − timerStartedAt) / 1000) + floor(elapsedMs / 1000), shown in MM:SS format with no NaN values

#### Scenario: No NaN displayed

- **WHEN** `timerStartedAt` is null or cannot be parsed as a valid Date
- **THEN** the timer display SHALL show `00:00` instead of `NaN:NaN`
