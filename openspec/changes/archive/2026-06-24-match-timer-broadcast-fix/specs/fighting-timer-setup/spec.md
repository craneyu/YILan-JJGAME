## MODIFIED Requirements

### Requirement: Duration confirmed via API before countdown starts

The referee interface SHALL call `PATCH /api/v1/matches/:id/duration` with `{ duration: number }` when the confirm button is clicked. The countdown SHALL NOT start until the API responds with HTTP 200.

Upon successful persistence of the new duration, the backend SHALL broadcast a `match:timer-updated` Socket.IO event to the event room so audience displays immediately reflect the newly set duration without waiting for the countdown to start. The broadcast SHALL include `matchId`, `remaining` equal to the persisted duration in seconds, `paused: true`, and `durationSec` equal to the persisted duration. This broadcast SHALL fire on both initial duration setup and subsequent duration changes (for example, when overtime is configured after a draw).

#### Scenario: Confirm button saves duration and starts countdown

- **WHEN** the referee confirms the duration selection
- **THEN** the frontend SHALL PATCH the match duration AND upon HTTP 200 response SHALL start the countdown AND SHALL dismiss the modal

#### Scenario: API error blocks start

- **WHEN** the PATCH /duration call returns a non-200 status
- **THEN** the modal SHALL remain open AND a SweetAlert2 error toast SHALL be displayed AND the countdown SHALL NOT start

#### Scenario: Duration broadcast on initial setup

- **WHEN** the referee confirms a duration of 180 seconds for a pending match and the backend persists it successfully
- **THEN** the backend SHALL emit `match:timer-updated` to the event room with payload `{ matchId, remaining: 180, paused: true, durationSec: 180 }`
- **AND** the audience display SHALL show `03:00` before the countdown starts

#### Scenario: Duration broadcast on overtime configuration

- **WHEN** the referee sets a new duration of 120 seconds for a match that previously had 180 seconds (for example, configuring an overtime round after a draw)
- **THEN** the backend SHALL emit `match:timer-updated` to the event room with payload `{ matchId, remaining: 120, paused: true, durationSec: 120 }`
- **AND** the audience display SHALL immediately show `02:00` without waiting for the countdown to start
