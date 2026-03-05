## ADDED Requirements

### Requirement: Admin can selectively clear scores by competition type

The system SHALL allow an admin to clear scores for a specific competition type (`Duo` or `Show`) without affecting scores of the other type. The system SHALL also retain the existing ability to clear all scores at once.

The `DELETE /api/v1/events/:id/scores` endpoint SHALL accept an optional query parameter `type` with values `Duo` or `Show`. When `type` is omitted, the endpoint SHALL clear scores for all competition types enabled on the event.

When clearing by type `Duo`, the system SHALL delete: `Score`, `VRScore`, and `WrongAttack` documents for the event, and reset the `GameState` to idle.

When clearing by type `Show`, the system SHALL delete: `CreativeScore` and `CreativePenalty` documents for the event, and reset the `CreativeGameState` to idle.

#### Scenario: Clear Duo scores only

- **WHEN** admin sends `DELETE /events/:id/scores?type=Duo`
- **THEN** all `Score`, `VRScore`, and `WrongAttack` records for the event SHALL be deleted
- **AND** `GameState` for the event SHALL be reset to `{ currentTeamId: null, currentRound: 1, currentActionNo: null, currentActionOpen: false }`
- **AND** `CreativeScore`, `CreativePenalty`, and `CreativeGameState` SHALL remain unchanged

#### Scenario: Clear Show scores only

- **WHEN** admin sends `DELETE /events/:id/scores?type=Show`
- **THEN** all `CreativeScore` and `CreativePenalty` records for the event SHALL be deleted
- **AND** `CreativeGameState` for the event SHALL be reset to `{ currentTeamId: null, status: 'idle', timerStartedAt: null, timerStoppedAt: null, timerElapsedMs: null }`
- **AND** `Score`, `VRScore`, `WrongAttack`, and `GameState` SHALL remain unchanged

#### Scenario: Clear all scores (no type parameter)

- **WHEN** admin sends `DELETE /events/:id/scores` with no `type` query parameter
- **THEN** all scores (Duo and Show) SHALL be cleared, identical to previous behavior
- **AND** both `GameState` and `CreativeGameState` SHALL be reset to idle

#### Scenario: Invalid type parameter

- **WHEN** admin sends `DELETE /events/:id/scores?type=InvalidValue`
- **THEN** the system SHALL respond with HTTP 400 and an error message indicating valid values are `Duo` or `Show`

#### Scenario: Type not in event competitionTypes

- **WHEN** admin sends `DELETE /events/:id/scores?type=Show` for an event that only has `competitionTypes: ['Duo']`
- **THEN** the system SHALL respond with HTTP 400 and an error message indicating the type is not enabled for this event

#### Scenario: Response includes deletion counts

- **WHEN** admin successfully clears scores
- **THEN** the response SHALL include `{ success: true, data: { message: '成績已清除', deletedScores: <number>, deletedVrScores: <number> } }`
- **AND** `deletedScores` SHALL reflect only the records deleted in this operation
