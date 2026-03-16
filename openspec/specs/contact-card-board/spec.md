## Requirements

### Requirement: Match model stores contact-specific foul and knockdown counts

The system SHALL store foul and knockdown counts per side in the Match document for contact matches.

The Match schema SHALL include:
- `foulCount: { red: Number (default: 0), blue: Number (default: 0) }`
- `knockdownCount: { red: Number (default: 0), blue: Number (default: 0) }`

These fields SHALL default to 0 and SHALL NOT affect existing ne-waza or fighting match documents.

#### Scenario: New contact match has zero counts

- **WHEN** a contact match is created
- **THEN** `foulCount.red`, `foulCount.blue`, `knockdownCount.red`, and `knockdownCount.blue` SHALL each be `0`


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
### Requirement: Referee can add or remove a foul card for either side

The referee interface SHALL provide [+犯規] and [-犯規] buttons for both red and blue sides.

The system SHALL increment or decrement the corresponding `foulCount` value via `PATCH /api/v1/matches/:id/contact-action`.

The foul count for any side SHALL NOT go below 0.

The system SHALL broadcast a `match:contact-foul-updated` Socket.IO event with payload `{ matchId, foulCount: { red, blue } }` after each change.

#### Scenario: Referee adds foul card to red side

- **WHEN** referee taps [+犯規] in the red section
- **THEN** `foulCount.red` SHALL increment by 1
- **THEN** `match:contact-foul-updated` SHALL be broadcast with updated counts

#### Scenario: Referee removes foul card from blue side when count is zero

- **WHEN** referee taps [-犯規] in the blue section and `foulCount.blue` is already 0
- **THEN** `foulCount.blue` SHALL remain 0 (no decrement below zero)
- **THEN** no Socket.IO event SHALL be emitted


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
### Requirement: Referee can add or remove a knockdown card for either side

The referee interface SHALL provide [+擊倒] and [-擊倒] buttons for both red and blue sides.

The knockdown card SHALL be displayed on the side of the player who was knocked down.

The system SHALL increment or decrement `knockdownCount` via `PATCH /api/v1/matches/:id/contact-action`.

The knockdown count for any side SHALL NOT go below 0.

The system SHALL broadcast a `match:contact-knockdown-updated` Socket.IO event with payload `{ matchId, knockdownCount: { red, blue } }` after each change.

#### Scenario: Referee adds knockdown card to blue side

- **WHEN** referee taps [+擊倒] in the blue section (blue player was knocked down)
- **THEN** `knockdownCount.blue` SHALL increment by 1
- **THEN** `match:contact-knockdown-updated` SHALL be broadcast with updated counts


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
### Requirement: Yellow card visual element uses poker card proportions

The audience display and referee interface SHALL render each foul card and knockdown card as a yellow rectangle with an aspect ratio of approximately 2:3 (portrait, poker card proportions).

Cards SHALL use `bg-yellow-400` color.

For each side, foul cards and knockdown cards SHALL be displayed in separate rows, showing the current count (1 or 2 cards visible; a third card is not shown — instead a winner declaration is triggered manually).

#### Scenario: Red side has 2 foul cards

- **WHEN** `foulCount.red` is 2
- **THEN** two yellow poker-proportion cards SHALL appear in the red foul row on both the referee interface and the audience display

#### Scenario: Red side has 0 foul cards

- **WHEN** `foulCount.red` is 0
- **THEN** the red foul row SHALL show no cards (empty state)


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
### Requirement: Referee manually declares match winner

The referee interface SHALL provide winner declaration buttons:
- [降伏勝 — 紅方勝] / [降伏勝 — 藍方勝] (submission win)
- [擊倒勝 — 紅方勝] / [擊倒勝 — 藍方勝] (knockdown win)
- [犯規失格 — 紅方勝] / [犯規失格 — 藍方勝] (foul disqualification)

The system SHALL NOT automatically declare a winner based on card counts — all win declarations SHALL require explicit referee action.

Upon declaration, the system SHALL call `PATCH /api/v1/matches/:id/contact-winner` with body `{ winner: 'red'|'blue', method: 'submission'|'knockdown'|'foul-dq' }`.

The system SHALL broadcast `match:contact-winner` event with payload `{ matchId, winner: 'red'|'blue', method: string }`.

#### Scenario: Referee declares red wins by submission

- **WHEN** referee taps [降伏勝 — 紅方勝]
- **THEN** the match status SHALL be updated to `finished` with `winner: 'red'` and `winMethod: 'submission'`
- **THEN** `match:contact-winner` SHALL be broadcast

#### Scenario: Audience sees winner overlay

- **WHEN** `match:contact-winner` event is received on the audience display
- **THEN** a full-screen overlay SHALL appear showing the winning side and win method in large text


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
### Requirement: Audience display shows card board without numerical scores

The audience display for contact matches SHALL show:
- Red and blue player names / labels
- Foul card row (yellow cards, one per foul count up to 2)
- Knockdown card row (yellow cards, one per knockdown count up to 2)
- Match timer
- Winner overlay when match is decided

The audience display SHALL NOT show any numerical score fields for contact matches.

#### Scenario: Audience display loads for a contact match

- **WHEN** the audience page loads for a match with `matchType: 'contact'`
- **THEN** numerical score sections (PART scores, total score) SHALL NOT be rendered
- **THEN** foul and knockdown card rows SHALL be rendered for both sides

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