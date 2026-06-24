## MODIFIED Requirements

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
