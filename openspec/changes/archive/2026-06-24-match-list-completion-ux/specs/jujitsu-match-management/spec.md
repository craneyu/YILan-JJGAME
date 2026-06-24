## ADDED Requirements

### Requirement: Ne-Waza referee returns to match list view after completing a bye match

After the ne-waza-referee component's `completeByeMatch` flow successfully PATCHes a bye match (`isBye === true`, `bluePlayer.name === ''`) to `status: 'completed'` and emits `match:ended`, the referee interface SHALL return to the match list view and clear the active match selection, mirroring the post-success behaviour of the standard `endMatch` flow.

Specifically, in the SweetAlert success callback chained after the API call, the component SHALL set its `view` signal to `"list"` and SHALL clear `activeMatch` to `null`. This SHALL happen unconditionally on success and SHALL NOT depend on the user dismissing the success dialog through a particular action.

#### Scenario: Bye match completion returns to list

- **WHEN** the ne-waza referee opens a match with `isBye === true` and `bluePlayer.name === ''` and triggers `completeByeMatch`
- **AND** the backend PATCH succeeds and the SweetAlert success dialog is dismissed
- **THEN** the referee component SHALL switch its `view` signal to `"list"`
- **AND** SHALL clear `activeMatch` so the match list is rendered

#### Scenario: Bye completion failure stays on the match detail view

- **WHEN** the backend PATCH for a bye match completion returns a non-success status
- **THEN** the SweetAlert error dialog SHALL be shown
- **AND** the component SHALL remain on the bye match detail view (`view !== "list"`) so the referee can retry without re-navigating
