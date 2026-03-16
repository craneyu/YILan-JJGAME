## Requirements

### Requirement: Match model stores golden minute count

The Match schema SHALL include `goldenMinuteCount: { type: Number, default: 0 }` for tracking how many golden minutes have been triggered in a contact match.

#### Scenario: New contact match has zero golden minutes

- **WHEN** a contact match is created
- **THEN** `goldenMinuteCount` SHALL be `0`


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
### Requirement: Referee can trigger golden minute up to twice

The referee interface SHALL provide a [黃金分鐘] button that is enabled when `goldenMinuteCount < 2`.

When triggered, the system SHALL:
1. Increment `goldenMinuteCount` by 1
2. Reset the match timer to 60 seconds
3. Pause the timer (do NOT start countdown automatically)
4. Broadcast `match:contact-golden-minute` with payload `{ matchId, goldenMinuteCount: number }`

The [黃金分鐘] button SHALL be disabled (not clickable) when `goldenMinuteCount >= 2`.

#### Scenario: Referee triggers first golden minute

- **WHEN** referee taps [黃金分鐘] and `goldenMinuteCount` is 0
- **THEN** `goldenMinuteCount` SHALL become 1
- **THEN** the match timer SHALL reset to 60 seconds and enter paused state
- **THEN** `match:contact-golden-minute` SHALL be broadcast with `goldenMinuteCount: 1`

#### Scenario: Referee triggers second golden minute

- **WHEN** referee taps [黃金分鐘] and `goldenMinuteCount` is 1
- **THEN** `goldenMinuteCount` SHALL become 2
- **THEN** the match timer SHALL reset to 60 seconds and enter paused state
- **THEN** `match:contact-golden-minute` SHALL be broadcast with `goldenMinuteCount: 2`

#### Scenario: Golden minute button is disabled after two uses

- **WHEN** `goldenMinuteCount` is 2
- **THEN** the [黃金分鐘] button SHALL be rendered in disabled state and SHALL NOT respond to taps


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
### Requirement: Referee manually starts golden minute countdown

After a golden minute is triggered, the match timer SHALL remain paused until the referee explicitly taps [開始] (the same start/resume button used for the main timer).

The countdown SHALL decrement from 60 seconds upon referee action.

#### Scenario: Referee starts golden minute countdown

- **WHEN** `goldenMinuteCount >= 1` and timer is paused at 60 seconds
- **WHEN** referee taps [開始]
- **THEN** the 60-second countdown SHALL begin


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
### Requirement: Audience display shows golden minute indicator

The audience display SHALL show the number of golden minutes triggered as a visual indicator (e.g., star icons or "黃金分鐘 ×N" label).

#### Scenario: One golden minute triggered on audience display

- **WHEN** `match:contact-golden-minute` is received with `goldenMinuteCount: 1`
- **THEN** the audience display SHALL show a golden minute indicator reflecting count 1

#### Scenario: Two golden minutes triggered on audience display

- **WHEN** `match:contact-golden-minute` is received with `goldenMinuteCount: 2`
- **THEN** the audience display SHALL show a golden minute indicator reflecting count 2

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