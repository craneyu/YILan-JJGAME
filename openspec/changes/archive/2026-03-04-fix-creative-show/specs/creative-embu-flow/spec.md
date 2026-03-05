## MODIFIED Requirements

### Requirement: Sequence judge opens scoring for a team

Before scoring begins, the sequence judge SHALL select the correct team from a list sorted first by category (male / female / mixed) and then by team order within each category. After selecting the team, the judge opens scoring, which broadcasts the current team information to all connected clients.

#### Scenario: Team list sorted by category then order

- **WHEN** the sequence judge views the team selection list
- **THEN** the list SHALL be grouped by category in the order: female → male → mixed (or as configured by event `categoryOrder`), and within each category teams SHALL be ordered by ascending `order` value

#### Scenario: Sequence judge opens scoring

- **WHEN** the sequence judge calls `POST /api/v1/creative/flow/open-scoring` with `{ eventId, teamId }`
- **THEN** the system SHALL update `/creative_game_states` to `status: 'scoring_open'`, set `currentTeamId`, and broadcast a `creative:scoring-opened` event with `{ eventId, teamId, teamName, members: string[], category }`
