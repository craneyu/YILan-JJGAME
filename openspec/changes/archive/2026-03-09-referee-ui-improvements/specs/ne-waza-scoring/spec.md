## ADDED Requirements

### Requirement: Referee timer fine-tune controls

The timer fine-tune controls SHALL be displayed when the timer is paused.

The controls SHALL include six buttons: ▲1s, ▼1s, ▲10s, ▼10s, ▲1min, ▼1min.

#### Scenario: Fine-tune timer by 1 second

- **WHEN** the timer is paused and referee taps the ▲1s or ▼1s button
- **THEN** the timer remaining value SHALL increase or decrease by 1 second respectively
- **THEN** the timer total SHALL update to match the new remaining value

## ADDED Requirements

### Requirement: Referee scoring card bottom row layout

Each player scoring card SHALL display a single bottom action row containing, in order: Submission Win, DQ, Injury Timeout, and Undo Last.

The DQ button SHALL appear immediately after the Submission Win button.

The Injury Timeout button SHALL appear after the DQ button, and Undo Last SHALL be the last button in the row.

#### Scenario: Bottom action row is displayed

- **WHEN** the referee views a player's scoring card
- **THEN** the bottom row SHALL contain Submission Win, DQ, Injury Timeout, and Undo Last buttons in that order
- **THEN** all four actions SHALL be visible in a single horizontal flex row

### Requirement: Injury timeout button icon

The injury timeout button SHALL use the FontAwesome `faPlus` icon instead of an emoji.

#### Scenario: Injury button displays plus icon

- **WHEN** the referee views the injury timeout button in either player's card
- **THEN** the button SHALL display a `faPlus` FontAwesome icon
