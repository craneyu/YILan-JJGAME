## ADDED Requirements

### Requirement: Sequence judge opens scoring for a team

Before scoring begins, the sequence judge SHALL select the correct group (category: male/female/mixed) and team order, then open scoring. This broadcasts the current team information to all connected clients.

#### Scenario: Sequence judge opens scoring

- **WHEN** the sequence judge calls `POST /api/v1/creative/flow/open-scoring` with `{ eventId, teamId }`
- **THEN** the system SHALL update `/creative_game_states` to `status: 'scoring_open'`, set `currentTeamId`, and broadcast a `creative:scoring-opened` event with `{ eventId, teamId, teamName, category }`

### Requirement: Sequence judge confirms score collection and ends the round

After all 5 judges have submitted and the sequence judge confirms, the round for the current team SHALL conclude and the system SHALL display the final calculated score on the audience page.

#### Scenario: Sequence judge confirms score collection

- **WHEN** the sequence judge calls `POST /api/v1/creative/flow/confirm-scores` with `{ eventId, teamId }`
- **AND** all 5 judges have already submitted scores
- **THEN** the system SHALL update state to `status: 'complete'` for that team, and the audience display SHALL show the final score including penalties

#### Scenario: Confirm blocked if not all judges submitted

- **WHEN** the sequence judge attempts to confirm scores but fewer than 5 judges have submitted
- **THEN** the system SHALL reject the request with HTTP 400 and a message indicating the number of missing submissions

### Requirement: Sequence judge advances to the next team

After confirming scores for the current team, the sequence judge SHALL be able to advance to the next team.

#### Scenario: Advance to next team

- **WHEN** the sequence judge calls `POST /api/v1/creative/flow/next-team` with `{ eventId }`
- **THEN** the system SHALL reset all scoring state for the new team, clear penalty records, reset the timer state, and broadcast a `creative:team-changed` event with the next team's information

### Requirement: Creative event state management

The system SHALL maintain a `/creative_game_states` document per event tracking: `currentTeamId`, `timerStartedAt`, `timerStoppedAt`, `timerElapsedMs`, and `status` (idle | scoring_open | timer_running | timer_stopped | scores_collected | complete).

#### Scenario: State document created with event

- **WHEN** a creative type event is created via `POST /api/v1/events` with `competitionType: 'creative'`
- **THEN** the system SHALL create a corresponding `/creative_game_states` document with `status: 'idle'`

#### Scenario: State reset on next team

- **WHEN** `POST /api/v1/creative/flow/next-team` is called
- **THEN** the system SHALL reset `timerStartedAt`, `timerStoppedAt`, `timerElapsedMs` to null, set `status: 'scoring_open'` for the new team
