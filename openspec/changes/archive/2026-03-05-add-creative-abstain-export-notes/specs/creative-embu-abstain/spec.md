## ADDED Requirements

### Requirement: Sequence judge can mark current team as abstained

The creative embu sequence judge SHALL be able to mark the currently selected team as abstained (棄權) via a dedicated button. The system SHALL call `POST /api/v1/creative/flow/abstain` with `{ eventId, teamId }`. On success, the backend SHALL set `isAbstained: true` on `CreativeGameState` and broadcast a `creative:team-abstained` Socket.IO event to all clients in the event room. The abstained team SHALL be excluded from the rankings.

#### Scenario: Sequence judge marks a team as abstained

- **WHEN** the sequence judge clicks the "設定此組棄權" button while a team is selected and no scoring is open
- **THEN** the system SHALL call `POST /creative/flow/abstain` with the current `eventId` and `teamId`
- **AND** `CreativeGameState.isAbstained` SHALL be set to `true`
- **AND** a `creative:team-abstained` event SHALL be broadcast to all clients with payload `{ eventId, teamId }`
- **AND** the button SHALL change to "取消棄權" state

#### Scenario: Sequence judge cancels abstain

- **WHEN** the sequence judge clicks "取消棄權" while the current team is marked as abstained
- **THEN** the system SHALL call `POST /creative/flow/abstain-cancel` with `{ eventId, teamId }`
- **AND** `CreativeGameState.isAbstained` SHALL be set to `false`
- **AND** a `creative:team-abstain-cancelled` event SHALL be broadcast to all clients

#### Scenario: Abstain button is disabled during active scoring or timer

- **WHEN** the timer is running (`timerStatus === 'running'`) or scoring is open (`scoringOpen === true`)
- **THEN** the "設定此組棄權" button SHALL be disabled and non-interactive

#### Scenario: Abstain status resets on team change

- **WHEN** the sequence judge switches to a different team (via nextTeam or selectTeam)
- **THEN** `isAbstained` SHALL be reset to `false` for the new team's session

### Requirement: Scoring judge receives abstain notification

When a team is marked as abstained, the scoring judge's interface SHALL update to reflect the abstain state and prevent score submission.

#### Scenario: Scoring judge sees abstain state

- **WHEN** the `creative:team-abstained` Socket.IO event is received by the scoring judge client
- **THEN** the scoring judge SHALL display an abstain notice and the submit button SHALL be disabled

#### Scenario: Scoring judge state resets on abstain-cancelled

- **WHEN** the `creative:team-abstain-cancelled` Socket.IO event is received
- **THEN** the scoring judge SHALL return to normal scoring state (if previously in scoring state)

### Requirement: Audience display shows abstain status

When a team is abstained, the audience display SHALL show a clear visual indicator.

#### Scenario: Audience sees abstain label

- **WHEN** the `creative:team-abstained` Socket.IO event is received by the audience client
- **THEN** the audience display SHALL show a "棄權" badge or label alongside the team name area

#### Scenario: Audience abstain label removed on cancel

- **WHEN** the `creative:team-abstain-cancelled` Socket.IO event is received
- **THEN** the "棄權" badge SHALL be removed from the audience display

### Requirement: CreativeGameState stores abstain flag

The `CreativeGameState` Mongoose schema SHALL include an `isAbstained` field to persist abstain status across page reloads.

#### Scenario: isAbstained field defaults to false

- **WHEN** a new `CreativeGameState` document is created (upsert on first use)
- **THEN** `isAbstained` SHALL default to `false`

#### Scenario: GET state endpoint returns isAbstained

- **WHEN** any client calls `GET /creative/flow/state/:eventId`
- **THEN** the response SHALL include `isAbstained: boolean` in the `data` object
