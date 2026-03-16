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


<!-- @trace
source: contact-v7-card-scoring
updated: 2026-03-16
code:
  - backend/src/routes/contactAction.ts
  - frontend/src/app/features/contact-audience/contact-audience.component.html
  - frontend/src/app/features/contact-audience/contact-audience.component.ts
  - backend/src/models/Match.ts
  - frontend/src/app/app.routes.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/referee-landing/referee-landing.component.ts
  - frontend/src/app/core/models/match.model.ts
  - backend/src/controllers/contactActionController.ts
  - frontend/src/app/features/contact-referee/contact-referee.component.ts
  - frontend/src/app/features/contact-referee/contact-referee.component.html
  - backend/src/controllers/contactWinnerController.ts
  - backend/src/sockets/index.ts
  - backend/src/index.ts
-->

---

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