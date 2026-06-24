## ADDED Requirements

### Requirement: Main timer bell on zero

The audience display components (contact-audience, fighting-audience, ne-waza-audience) SHALL play a long bell sound (`bell-long.mp3`) when the main match timer (`timerRemaining` signal) transitions from a value greater than 0 to exactly 0.

The bell SHALL NOT play when the timer is initialized to 0, reset to 0, or when a new match loads with timerRemaining already at 0.

#### Scenario: Main timer counts down to zero in contact-audience

- **WHEN** `timerRemaining` decrements from 1 to 0 in the contact-audience component
- **THEN** the system SHALL play `assets/sounds/bell-long.mp3`

#### Scenario: Main timer counts down to zero in fighting-audience

- **WHEN** `timerRemaining` decrements from 1 to 0 in the fighting-audience component
- **THEN** the system SHALL play `assets/sounds/bell-long.mp3`

#### Scenario: Main timer counts down to zero in ne-waza-audience

- **WHEN** `timerRemaining` decrements from 1 to 0 in the ne-waza-audience component
- **THEN** the system SHALL play `assets/sounds/bell-long.mp3`

#### Scenario: Timer reset does not trigger bell

- **WHEN** `timerRemaining` is set to 0 as part of a match reset or initial load (previous value was also 0 or undefined)
- **THEN** the system SHALL NOT play any bell sound


<!-- @trace
source: audience-timer-bell-sounds
updated: 2026-03-24
code:
  - .github/prompts/spectra-propose.prompt.md
  - .github/skills/spectra-propose/SKILL.md
-->


<!-- @trace
source: match-timer-broadcast-fix
updated: 2026-06-24
code:
  - frontend/src/app/core/utils/match-grouping.ts
  - frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - frontend/package.json
  - frontend/src/app/features/check-in/check-in.component.html
  - frontend/jest.config.js
  - frontend/tsconfig.spec.json
  - backend/src/sockets/index.ts
  - frontend/src/app/app.routes.ts
  - frontend/setup-jest.ts
  - frontend/src/app/features/admin/judge-management/judge-management.component.ts
  - backend/jest.config.js
  - backend/src/models/User.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - backend/src/controllers/creativeRankingsController.ts
  - TESTING.md
  - backend/src/models/Team.ts
  - backend/src/seeds/migrateMembersToObjects.ts
  - frontend/src/app/shared/participant-badge.component.ts
  - frontend/tsconfig.json
  - backend/src/utils/forfeitPropagation.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - frontend/src/app/features/contact-referee/contact-referee.component.ts
  - frontend/src/app/features/fighting-audience/fighting-audience.component.ts
  - backend/src/routes/checkIn.ts
  - backend/src/controllers/checkInController.ts
  - backend/src/controllers/matchScoreController.ts
  - frontend/src/app/features/contact-referee/contact-referee.component.html
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - backend/src/index.ts
  - backend/src/controllers/eventController.ts
  - backend/src/seeds/initialUsers.ts
  - frontend/src/app/features/check-in/check-in.component.ts
  - backend/src/controllers/creativeTimerController.ts
  - frontend/src/app/features/fighting-referee/fighting-referee.component.ts
  - backend/src/controllers/creativeFlowController.ts
  - frontend/src/app/features/contact-audience/contact-audience.component.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - frontend/src/app/core/services/auth.service.ts
  - frontend/src/app/features/fighting-referee/fighting-referee.component.html
  - backend/src/controllers/teamController.ts
  - frontend/src/app/features/login/login.component.ts
  - backend/package.json
tests:
  - backend/src/utils/__tests__/forfeitPropagation.test.ts
  - frontend/src/app/core/utils/match-grouping.spec.ts
  - frontend/src/app/shared/participant-badge.component.spec.ts
  - backend/src/models/__tests__/Team.test.ts
  - backend/src/utils/__tests__/scoring.test.ts
-->

### Requirement: OSAE KOMI bell on zero

The fighting-audience component SHALL play a short bell sound (`bell-short.mp3`) when an OSAE KOMI timer (`redOsaeKomiRemaining` or `blueOsaeKomiRemaining`) transitions from a value greater than 0 to exactly 0.

#### Scenario: Red OSAE KOMI timer reaches zero

- **WHEN** `redOsaeKomiRemaining` decrements from 1 to 0 in the fighting-audience component
- **THEN** the system SHALL play `assets/sounds/bell-short.mp3`

#### Scenario: Blue OSAE KOMI timer reaches zero

- **WHEN** `blueOsaeKomiRemaining` decrements from 1 to 0 in the fighting-audience component
- **THEN** the system SHALL play `assets/sounds/bell-short.mp3`


<!-- @trace
source: audience-timer-bell-sounds
updated: 2026-03-24
code:
  - .github/prompts/spectra-propose.prompt.md
  - .github/skills/spectra-propose/SKILL.md
-->

### Requirement: Sound assets

The frontend application SHALL include two audio files as static assets:

- `assets/sounds/bell-long.mp3`: A long bell sound for main timer expiration
- `assets/sounds/bell-short.mp3`: A short bell sound for OSAE KOMI timer expiration

#### Scenario: Assets available after build

- **WHEN** the frontend application is built for production
- **THEN** both `bell-long.mp3` and `bell-short.mp3` SHALL be present in the output `dist/` directory under `assets/sounds/`


<!-- @trace
source: audience-timer-bell-sounds
updated: 2026-03-24
code:
  - .github/prompts/spectra-propose.prompt.md
  - .github/skills/spectra-propose/SKILL.md
-->

### Requirement: Graceful handling of autoplay restriction

The bell playback SHALL use `HTMLAudioElement.play()`. If the browser blocks playback due to autoplay policy (no prior user gesture), the system SHALL silently ignore the error without disrupting the application.

#### Scenario: Browser blocks autoplay

- **WHEN** the timer reaches zero and the browser blocks audio playback
- **THEN** the system SHALL catch the rejected promise and continue normal operation without displaying any error to the user

## Requirements

<!-- @trace
source: audience-timer-bell-sounds
updated: 2026-03-24
code:
  - .github/prompts/spectra-propose.prompt.md
  - .github/skills/spectra-propose/SKILL.md
-->

### Requirement: Main timer bell on zero

The audience display components (contact-audience, fighting-audience, ne-waza-audience, match-audience) SHALL play a long bell sound (`bell-long.mp3`) when the main match timer (`timerRemaining` signal) transitions from a value greater than 0 to exactly 0 during natural countdown of the currently displayed active match.

The bell SHALL NOT play when the timer is initialized to 0, reset to 0, when a new match loads with `timerRemaining` already at 0, or when `timerRemaining` transitions through 0 as a side effect of switching the displayed active match.

To prevent false triggering during match switch, the audience component SHALL reset its `previousTimerValue` tracker to `-1` (or otherwise suppress the bell guard) when the displayed active match changes or when a `match:ended` event arrives for the currently displayed match. After the reset, only a subsequent natural countdown from a positive value to 0 SHALL trigger the bell.

#### Scenario: Main timer counts down to zero in contact-audience

- **WHEN** `timerRemaining` decrements from 1 to 0 in the contact-audience component while the match is in progress
- **THEN** the system SHALL play `assets/sounds/bell-long.mp3`

#### Scenario: Main timer counts down to zero in fighting-audience

- **WHEN** `timerRemaining` decrements from 1 to 0 in the fighting-audience component while the match is in progress
- **THEN** the system SHALL play `assets/sounds/bell-long.mp3`

#### Scenario: Main timer counts down to zero in ne-waza-audience

- **WHEN** `timerRemaining` decrements from 1 to 0 in the ne-waza-audience component while the match is in progress
- **THEN** the system SHALL play `assets/sounds/bell-long.mp3`

#### Scenario: Timer reset does not trigger bell

- **WHEN** `timerRemaining` is set to 0 as part of a match reset or initial load (previous value was also 0 or undefined)
- **THEN** the system SHALL NOT play any bell sound

#### Scenario: Match switch does not trigger bell

- **WHEN** the audience component switches from a finished match (where `timerRemaining` previously held a positive value such as 180) to a newly loaded active match whose `timerRemaining` is being reset to its new `matchDuration`
- **AND** the signal momentarily transitions through 0 during the switch
- **THEN** the system SHALL NOT play any bell sound

##### Example: 180 → 0 → 180 during match switch

- **GIVEN** match A has just ended with `timerRemaining = 180` still held in the component, and match B (the next match) has `matchDuration = 180`
- **WHEN** the component loads match B and the signal sequence becomes `180 → 0 → 180`
- **THEN** no bell SHALL play because `previousTimerValue` is reset to `-1` at the moment match B is loaded, suppressing the natural-countdown guard

#### Scenario: Match end does not trigger bell

- **WHEN** a `match:ended` Socket.IO event is received for the currently displayed match (referee declared a winner mid-countdown)
- **THEN** `previousTimerValue` SHALL be reset such that any subsequent transition through 0 does not trigger the bell until a fresh natural countdown begins

---
### Requirement: OSAE KOMI bell on zero

The fighting-audience component SHALL play a short bell sound (`bell-short.mp3`) when an OSAE KOMI timer (`redOsaeKomiRemaining` or `blueOsaeKomiRemaining`) transitions from a value greater than 0 to exactly 0.

#### Scenario: Red OSAE KOMI timer reaches zero

- **WHEN** `redOsaeKomiRemaining` decrements from 1 to 0 in the fighting-audience component
- **THEN** the system SHALL play `assets/sounds/bell-short.mp3`

#### Scenario: Blue OSAE KOMI timer reaches zero

- **WHEN** `blueOsaeKomiRemaining` decrements from 1 to 0 in the fighting-audience component
- **THEN** the system SHALL play `assets/sounds/bell-short.mp3`

---
### Requirement: Sound assets

The frontend application SHALL include two audio files as static assets:

- `assets/sounds/bell-long.mp3`: A long bell sound for main timer expiration
- `assets/sounds/bell-short.mp3`: A short bell sound for OSAE KOMI timer expiration

#### Scenario: Assets available after build

- **WHEN** the frontend application is built for production
- **THEN** both `bell-long.mp3` and `bell-short.mp3` SHALL be present in the output `dist/` directory under `assets/sounds/`

---
### Requirement: Graceful handling of autoplay restriction

The bell playback SHALL use `HTMLAudioElement.play()`. If the browser blocks playback due to autoplay policy (no prior user gesture), the system SHALL silently ignore the error without disrupting the application.

#### Scenario: Browser blocks autoplay

- **WHEN** the timer reaches zero and the browser blocks audio playback
- **THEN** the system SHALL catch the rejected promise and continue normal operation without displaying any error to the user