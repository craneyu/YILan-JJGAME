## ADDED Requirements

### Requirement: Admin can reset match scores in bulk via API

The system SHALL expose `POST /api/v1/match-scores/reset-bulk` requiring `admin` role. The request body SHALL contain `{ matchIds: string[] }`. For each matchId, the system SHALL reset all score fields to zero, delete all associated `MatchScoreLog` documents, set `status` to `"pending"`, and clear the `result` field. The system SHALL respond with `{ success: true, resetCount: number }`.

#### Scenario: Bulk reset with valid matchIds

- **WHEN** admin sends `POST /match-scores/reset-bulk` with `{ matchIds: ["id1", "id2"] }`
- **THEN** both Match documents SHALL have all score fields set to 0
- **AND** both Match documents SHALL have `status` set to `"pending"`
- **AND** both Match documents SHALL have `result` cleared (undefined/removed)
- **AND** all MatchScoreLog documents for those matchIds SHALL be deleted
- **AND** the response SHALL be `{ success: true, resetCount: 2 }`

#### Scenario: Empty matchIds array

- **WHEN** admin sends `POST /match-scores/reset-bulk` with `{ matchIds: [] }`
- **THEN** the system SHALL respond with HTTP 400 and `{ success: false, error: "matchIds 不可為空" }`

#### Scenario: Non-admin role is rejected

- **WHEN** a non-admin user sends `POST /match-scores/reset-bulk`
- **THEN** the system SHALL respond with HTTP 403

### Requirement: Admin can clear all match scores for a sport type

The match management UI for each sport type (fighting / ne-waza / contact) SHALL display a "清除全部成績" button. When clicked, the system SHALL collect all match IDs for the current `matchType` in the current event, send them to `POST /match-scores/reset-bulk`, and update the local match list to reflect `status: pending` and cleared scores.

#### Scenario: Clear all scores for fighting type

- **WHEN** admin clicks "清除全部成績" in the fighting management page and confirms the dialog
- **THEN** all fighting matches SHALL be sent to `reset-bulk`
- **AND** the UI SHALL update each match row to show `status: pending` and no score data
- **AND** a success toast SHALL display the count of reset matches

#### Scenario: Cancel confirmation dialog

- **WHEN** admin clicks "清除全部成績" but cancels the SweetAlert2 confirmation dialog
- **THEN** no API call SHALL be made and match data SHALL remain unchanged

### Requirement: Admin can clear only completed match scores for a sport type

The match management UI SHALL display a "清除已完成成績" button per sport type. When clicked, the system SHALL filter matches where `status === "completed"`, collect their IDs, and send to `POST /match-scores/reset-bulk`.

#### Scenario: Clear completed scores only

- **WHEN** admin clicks "清除已完成成績" and confirms
- **THEN** only matches with `status === "completed"` SHALL be included in the reset-bulk call
- **AND** matches with `status !== "completed"` (pending, in-progress) SHALL remain unchanged
- **AND** a success toast SHALL display the count of reset matches

#### Scenario: No completed matches exist

- **WHEN** admin clicks "清除已完成成績" and no matches have `status === "completed"`
- **THEN** no API call SHALL be made
- **AND** the system SHALL show an informational toast: "目前沒有已完成的場次"

### Requirement: Admin can select individual matches and clear their scores

The match management UI SHALL render a checkbox on each match row and a "全選" checkbox in the table header. When one or more checkboxes are selected, a "清除所選成績（N 筆）" button SHALL appear. Clicking it SHALL send the selected match IDs to `POST /match-scores/reset-bulk`.

#### Scenario: Select and clear individual matches

- **WHEN** admin checks 2 match checkboxes and clicks "清除所選成績（2 筆）" and confirms
- **THEN** only those 2 matches SHALL be sent to `reset-bulk`
- **AND** the checkboxes SHALL be deselected after successful reset

#### Scenario: Select all via header checkbox

- **WHEN** admin clicks the "全選" header checkbox
- **THEN** all currently displayed match rows SHALL be checked
- **AND** the "清除所選成績（N 筆）" button SHALL reflect the total count

#### Scenario: Deselect all when header checkbox is unchecked

- **WHEN** admin unchecks the "全選" header checkbox
- **THEN** all match rows SHALL be deselected
- **AND** the "清除所選成績" button SHALL disappear
