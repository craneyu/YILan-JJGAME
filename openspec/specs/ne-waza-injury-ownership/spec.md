## ADDED Requirements

### Requirement: Injury timeout with side ownership

The system SHALL support injury timeouts attributed to a specific player side (`red` or `blue`).

The referee interface SHALL provide separate injury timeout buttons for each side (red and blue player sections).

When an injury timeout is started, the system SHALL broadcast an `injury:started` socket event with payload `{ eventId, matchId, side: 'red' | 'blue', durationSec: number }`.

When an injury timeout ends (timer expires or referee resumes), the system SHALL broadcast an `injury:ended` socket event with payload `{ eventId, matchId, side: 'red' | 'blue' }`.

#### Scenario: Referee starts injury timeout for red player

- **WHEN** referee taps the injury timeout button in the red player section
- **THEN** the match timer SHALL pause
- **THEN** an injury countdown SHALL start for the red side
- **THEN** an `injury:started` socket event SHALL be broadcast with `side: 'red'`

#### Scenario: Referee starts injury timeout for blue player

- **WHEN** referee taps the injury timeout button in the blue player section
- **THEN** the match timer SHALL pause
- **THEN** an injury countdown SHALL start for the blue side
- **THEN** an `injury:started` socket event SHALL be broadcast with `side: 'blue'`

#### Scenario: Injury timeout ends

- **WHEN** the referee taps the resume button after an injury timeout
- **THEN** the injury countdown SHALL stop
- **THEN** an `injury:ended` socket event SHALL be broadcast with the corresponding `side`
- **THEN** the match timer SHALL resume

### Requirement: Injury timeout display in audience scoreboard

The audience scoreboard SHALL display an injury timeout indicator inside the affected player's row when an injury timeout is active.

The indicator SHALL show the remaining injury time in MM:SS format.

When no injury timeout is active for a side, no indicator SHALL be shown.

#### Scenario: Audience sees red player injury timeout

- **WHEN** an `injury:started` event with `side: 'red'` is received on the audience display
- **THEN** a countdown indicator SHALL appear inside the red player's row
- **THEN** the countdown SHALL decrement every second

#### Scenario: Injury timeout indicator disappears

- **WHEN** an `injury:ended` event is received
- **THEN** the countdown indicator for the corresponding side SHALL be removed

## Requirements


<!-- @trace
source: match-ui-v5
updated: 2026-03-10
code:
  - SPEC/SPEC-v5.md
  - frontend/src/app/features/match-audience/match-audience.component.html
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - .github/skills/spectra-propose/SKILL.md
  - frontend/src/app/features/match-referee/match-referee.component.html
  - .github/prompts/spectra-apply.prompt.md
  - .github/skills/spectra-apply/SKILL.md
  - .github/prompts/spectra-propose.prompt.md
-->