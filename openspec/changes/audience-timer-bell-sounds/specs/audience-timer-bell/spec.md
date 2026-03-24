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

### Requirement: OSAE KOMI bell on zero

The fighting-audience component SHALL play a short bell sound (`bell-short.mp3`) when an OSAE KOMI timer (`redOsaeKomiRemaining` or `blueOsaeKomiRemaining`) transitions from a value greater than 0 to exactly 0.

#### Scenario: Red OSAE KOMI timer reaches zero

- **WHEN** `redOsaeKomiRemaining` decrements from 1 to 0 in the fighting-audience component
- **THEN** the system SHALL play `assets/sounds/bell-short.mp3`

#### Scenario: Blue OSAE KOMI timer reaches zero

- **WHEN** `blueOsaeKomiRemaining` decrements from 1 to 0 in the fighting-audience component
- **THEN** the system SHALL play `assets/sounds/bell-short.mp3`

### Requirement: Sound assets

The frontend application SHALL include two audio files as static assets:

- `assets/sounds/bell-long.mp3`: A long bell sound for main timer expiration
- `assets/sounds/bell-short.mp3`: A short bell sound for OSAE KOMI timer expiration

#### Scenario: Assets available after build

- **WHEN** the frontend application is built for production
- **THEN** both `bell-long.mp3` and `bell-short.mp3` SHALL be present in the output `dist/` directory under `assets/sounds/`

### Requirement: Graceful handling of autoplay restriction

The bell playback SHALL use `HTMLAudioElement.play()`. If the browser blocks playback due to autoplay policy (no prior user gesture), the system SHALL silently ignore the error without disrupting the application.

#### Scenario: Browser blocks autoplay

- **WHEN** the timer reaches zero and the browser blocks audio playback
- **THEN** the system SHALL catch the rejected promise and continue normal operation without displaying any error to the user
