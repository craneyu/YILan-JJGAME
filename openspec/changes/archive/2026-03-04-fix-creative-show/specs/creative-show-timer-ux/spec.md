## ADDED Requirements

### Requirement: Timer view displays current team information in real-time

The sequence judge's timer view SHALL display the current team's category, team name, and participant names at all times. This information SHALL update immediately whenever the sequence judge selects a different team, without requiring a page reload.

#### Scenario: Team info shown when timer is idle

- **WHEN** the sequence judge has selected a team and the timer view is displayed
- **THEN** the timer view SHALL show: the team's category label (男子組/女子組/混合組), the team name, and the comma-separated participant names

#### Scenario: Team info updates when team is changed

- **WHEN** the sequence judge selects a different team from the team list
- **THEN** the timer view SHALL immediately update category, team name, and participant names to reflect the newly selected team

#### Scenario: Placeholder shown when no team selected

- **WHEN** no team has been selected yet
- **THEN** the timer view SHALL display a placeholder message instead of team information

### Requirement: Timer view provides pause, resume, and reset controls

The sequence judge timer view SHALL provide three distinct controls: Start/Pause/Resume (toggling with Space key), and a separate Reset button. The timer state SHALL persist in `/creative_game_states` so that page reloads restore the correct state.

#### Scenario: Pause button visible while running

- **WHEN** the timer is in `running` status
- **THEN** the UI SHALL display a Pause button (or equivalent label change) and the Space key SHALL pause the timer

#### Scenario: Resume button visible while paused

- **WHEN** the timer is in `paused` status
- **THEN** the UI SHALL display a Resume button and the Space key SHALL resume the timer

#### Scenario: Reset button always visible

- **WHEN** the timer view is displayed regardless of timer status
- **THEN** a Reset button SHALL be visible; clicking it SHALL reset elapsed time to 00:00 and set status to idle

#### Scenario: Page reload restores timer state

- **WHEN** the sequence judge reloads the page while the timer is paused with accumulated elapsed time
- **THEN** the displayed elapsed time SHALL restore to the saved `timerElapsedMs` value in MM:SS format
