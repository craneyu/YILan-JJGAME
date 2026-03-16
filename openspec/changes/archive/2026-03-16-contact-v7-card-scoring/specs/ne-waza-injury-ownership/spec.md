## ADDED Requirements

### Requirement: Injury timeout is supported for contact matches

The injury timeout mechanism (side-attributed, timer pause, audience countdown) SHALL be available for matches with `matchType: 'contact'`, in addition to the existing `ne-waza` support.

The referee interface for contact matches SHALL provide separate injury timeout buttons for the red and blue sides, identical in behavior to the ne-waza injury timeout buttons.

When an injury timeout is started in a contact match, the system SHALL broadcast an `injury:started` socket event with payload `{ eventId, matchId, side: 'red' | 'blue', durationSec: number }`.

When the injury timeout ends, the system SHALL broadcast `injury:ended` with payload `{ eventId, matchId, side: 'red' | 'blue' }`.

#### Scenario: Contact match referee starts injury timeout for red player

- **WHEN** referee taps the injury timeout button in the red section of a contact match
- **THEN** the match timer SHALL pause
- **THEN** an injury countdown SHALL start for the red side
- **THEN** `injury:started` SHALL be broadcast with `side: 'red'`

#### Scenario: Contact match audience sees injury countdown

- **WHEN** `injury:started` with `side: 'blue'` is received on the audience display for a contact match
- **THEN** a countdown indicator SHALL appear inside the blue player's area
- **THEN** the countdown SHALL decrement every second until `injury:ended` is received
