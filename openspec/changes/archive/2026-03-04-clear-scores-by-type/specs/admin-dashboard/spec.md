## ADDED Requirements

### Requirement: Admin can selectively clear scores per competition type from the dashboard

The admin dashboard SHALL display up to three score-clearing actions per event, depending on which competition types are enabled on the event:

- "清除雙人演武成績" — visible only when the event includes `competitionTypes: ['Duo', ...]`
- "清除創意演武成績" — visible only when the event includes `competitionTypes: [..., 'Show']`
- "清除全部成績" — always visible

Each action SHALL display a SweetAlert2 confirmation dialog naming the specific type being cleared before proceeding. The dialog SHALL explicitly state that the operation is irreversible.

On confirmation, the frontend SHALL call `DELETE /api/v1/events/:id/scores` with the appropriate `type` query parameter (`Duo`, `Show`, or omitted for all). On success, the frontend SHALL display a toast notification showing the count of deleted records.

#### Scenario: Event with both Duo and Show types shows three buttons

- **WHEN** admin views an event card where `competitionTypes` includes both `Duo` and `Show`
- **THEN** three clearing buttons SHALL be displayed: "清除雙人演武成績", "清除創意演武成績", and "清除全部成績"

#### Scenario: Event with only Duo shows one type button plus all-clear

- **WHEN** admin views an event card where `competitionTypes` is `['Duo']`
- **THEN** only "清除雙人演武成績" and "清除全部成績" SHALL be displayed
- **AND** "清除創意演武成績" SHALL NOT be displayed

#### Scenario: Confirmation dialog names the clearing scope

- **WHEN** admin clicks "清除雙人演武成績"
- **THEN** a SweetAlert2 confirmation dialog SHALL appear with text indicating that all 雙人演武 scores will be permanently deleted

#### Scenario: Success toast shows deleted record count

- **WHEN** admin confirms a selective clear and the API returns successfully
- **THEN** a toast notification SHALL appear showing the number of deleted score records
