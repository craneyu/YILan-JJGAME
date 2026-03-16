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

The referee interface SHALL provide a [黃金分鐘] button that is enabled only when ALL of the following conditions are met:
1. `goldenMinuteCount < 2`
2. The match timer has naturally counted down to zero (i.e., the `timerNaturallyEnded` flag is `true`)

The button SHALL NOT be enabled when the timer was manually adjusted to zero or when the timer is still running.

When triggered, the system SHALL:
1. Increment `goldenMinuteCount` by 1
2. Reset the match timer to 60 seconds
3. Pause the timer (do NOT start countdown automatically)
4. Reset `timerNaturallyEnded` to `false`
5. Broadcast `match:contact-golden-minute` with payload `{ matchId, goldenMinuteCount: number }`

#### Scenario: Golden minute button disabled while main timer is running

- **WHEN** the main match timer is actively counting down
- **THEN** the [黃金分鐘] button SHALL be disabled regardless of `goldenMinuteCount`

#### Scenario: Golden minute button disabled after manual timer adjustment to zero

- **WHEN** the referee uses [-1s] or [-10s] to reduce the timer to 0 seconds
- **THEN** the [黃金分鐘] button SHALL remain disabled (timerNaturallyEnded is false)

#### Scenario: First golden minute available after main timer naturally expires

- **WHEN** the 3-minute main timer counts down to 0 via the interval (natural expiry)
- **THEN** `timerNaturallyEnded` SHALL become `true`
- **THEN** the [黃金分鐘] button SHALL become enabled (if `goldenMinuteCount` is 0)

#### Scenario: Referee triggers first golden minute

- **WHEN** referee taps [黃金分鐘] and `goldenMinuteCount` is 0 and `timerNaturallyEnded` is `true`
- **THEN** `goldenMinuteCount` SHALL become 1
- **THEN** the match timer SHALL reset to 60 seconds and enter paused state
- **THEN** `timerNaturallyEnded` SHALL become `false`
- **THEN** `match:contact-golden-minute` SHALL be broadcast with `goldenMinuteCount: 1`

#### Scenario: Second golden minute not available until first naturally expires

- **WHEN** `goldenMinuteCount` is 1 and the 60-second golden minute timer is still running or was paused before reaching 0
- **THEN** the [黃金分鐘] button SHALL be disabled

#### Scenario: Second golden minute available after first golden minute naturally expires

- **WHEN** the 60-second first golden minute timer counts down to 0 via the interval (natural expiry)
- **THEN** `timerNaturallyEnded` SHALL become `true`
- **THEN** the [黃金分鐘] button SHALL become enabled (if `goldenMinuteCount` is 1)

#### Scenario: Referee triggers second golden minute

- **WHEN** referee taps [黃金分鐘] and `goldenMinuteCount` is 1 and `timerNaturallyEnded` is `true`
- **THEN** `goldenMinuteCount` SHALL become 2
- **THEN** the match timer SHALL reset to 60 seconds and enter paused state
- **THEN** `timerNaturallyEnded` SHALL become `false`
- **THEN** `match:contact-golden-minute` SHALL be broadcast with `goldenMinuteCount: 2`

#### Scenario: Golden minute button is disabled after two uses

- **WHEN** `goldenMinuteCount` is 2
- **THEN** the [黃金分鐘] button SHALL be rendered in disabled state and SHALL NOT respond to taps


<!-- @trace
source: contact-golden-minute-sequencing
updated: 2026-03-16
code:
  - backend/src/controllers/contactCancelWinnerController.ts
  - frontend/src/app/features/fighting-referee/fighting-referee.component.html
  - frontend/src/app/features/contact-referee/contact-referee.component.ts
  - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
  - frontend/src/app/features/fighting-audience/fighting-audience.component.html
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/controllers/contactActionController.ts
  - frontend/src/app/features/contact-audience/contact-audience.component.ts
  - frontend/src/app/features/contact-audience/contact-audience.component.html
  - frontend/src/app/features/contact-referee/contact-referee.component.html
  - backend/src/routes/contactAction.ts
  - backend/src/controllers/contactWinnerController.ts
  - backend/src/models/Match.ts
  - backend/src/sockets/index.ts
  - backend/src/routes/matches.ts
  - backend/src/controllers/batchResetMatchesController.ts
-->

---
### Requirement: Referee can fine-adjust the match timer while paused

The referee interface SHALL display four timer adjustment buttons when the timer is paused and no winner has been declared: [-10s], [-1s], [+1s], [+10s].

Each button SHALL:
1. Modify `timerRemaining` by the corresponding delta (clamped to minimum 0)
2. Reset `timerNaturallyEnded` to `false`

The adjustment buttons SHALL be disabled (not rendered or not clickable) when the timer is running or when a winner has been declared.

#### Scenario: Referee adjusts timer down by 1 second

- **WHEN** the timer is paused and the referee taps [-1s]
- **THEN** `timerRemaining` SHALL decrease by 1 (minimum 0)
- **THEN** `timerNaturallyEnded` SHALL become `false`

#### Scenario: Referee adjusts timer up by 10 seconds

- **WHEN** the timer is paused and the referee taps [+10s]
- **THEN** `timerRemaining` SHALL increase by 10
- **THEN** `timerNaturallyEnded` SHALL become `false`

#### Scenario: Adjustment buttons hidden while timer is running

- **WHEN** the match timer is actively counting down
- **THEN** the adjustment buttons SHALL NOT be interactive


<!-- @trace
source: contact-golden-minute-sequencing
updated: 2026-03-16
code:
  - backend/src/routes/contactAction.ts
  - frontend/src/app/features/contact-referee/contact-referee.component.ts
  - frontend/src/app/features/contact-referee/contact-referee.component.html
  - backend/src/controllers/contactActionController.ts
  - backend/src/sockets/index.ts
-->


<!-- @trace
source: contact-golden-minute-sequencing
updated: 2026-03-16
code:
  - backend/src/controllers/contactCancelWinnerController.ts
  - frontend/src/app/features/fighting-referee/fighting-referee.component.html
  - frontend/src/app/features/contact-referee/contact-referee.component.ts
  - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
  - frontend/src/app/features/fighting-audience/fighting-audience.component.html
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/controllers/contactActionController.ts
  - frontend/src/app/features/contact-audience/contact-audience.component.ts
  - frontend/src/app/features/contact-audience/contact-audience.component.html
  - frontend/src/app/features/contact-referee/contact-referee.component.html
  - backend/src/routes/contactAction.ts
  - backend/src/controllers/contactWinnerController.ts
  - backend/src/models/Match.ts
  - backend/src/sockets/index.ts
  - backend/src/routes/matches.ts
  - backend/src/controllers/batchResetMatchesController.ts
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