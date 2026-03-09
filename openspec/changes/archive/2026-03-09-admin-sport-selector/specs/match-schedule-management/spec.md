## ADDED Requirements

### Requirement: Match management page loads matches by sport type

The match management page at `/admin/matches/:matchType` SHALL read the `matchType` route parameter (one of `ne-waza`, `fighting`, `contact`) and display only matches of that type for the selected event.

#### Scenario: Admin opens match management for Ne-Waza

- **WHEN** admin navigates to `/admin/matches/ne-waza` and selects an event
- **THEN** the system SHALL call `GET /api/v1/events/:eventId/matches?matchType=ne-waza`
- **THEN** the page SHALL display only ne-waza matches grouped by `weightClass`

#### Scenario: No event selected

- **WHEN** admin has not selected an event
- **THEN** the page SHALL display an event selection dropdown and no match list

### Requirement: Match list is grouped by weight class

Matches SHALL be displayed grouped by `weightClass`, sorted by `scheduledOrder` within each group. Each group SHALL be expandable/collapsible.

#### Scenario: Matches grouped and sorted

- **WHEN** the match list loads
- **THEN** matches with the same `weightClass` SHALL appear in the same group
- **THEN** within each group, matches SHALL be ordered by `scheduledOrder` ascending

### Requirement: Admin can edit a pending match inline

Admin SHALL be able to edit `redPlayer.name`, `redPlayer.teamName`, `bluePlayer.name`, `bluePlayer.teamName`, and `scheduledOrder` for matches with `status !== 'completed'`. Editing SHALL be done inline in the table row. The system SHALL call `PATCH /api/v1/events/:eventId/matches/:matchId` on save.

#### Scenario: Admin edits a pending match

- **WHEN** admin clicks the edit button on a non-completed match row
- **THEN** the row SHALL transform into editable input fields
- **WHEN** admin clicks save
- **THEN** the system SHALL call `PATCH /api/v1/events/:eventId/matches/:matchId` with updated fields
- **THEN** the list SHALL refresh with updated data

#### Scenario: Completed match is locked

- **WHEN** a match has `status === 'completed'`
- **THEN** the edit and delete buttons SHALL be disabled
- **THEN** the row SHALL display a visual lock indicator

### Requirement: Admin can delete a single match

Admin SHALL be able to delete a single non-completed match. The system SHALL prompt for confirmation before deletion. The backend SHALL expose `DELETE /api/v1/events/:eventId/matches/:matchId` restricted to `admin` role.

#### Scenario: Admin deletes a match with confirmation

- **WHEN** admin clicks delete on a non-completed match
- **THEN** the system SHALL display a SweetAlert2 confirmation dialog
- **WHEN** admin confirms
- **THEN** the system SHALL call `DELETE /api/v1/events/:eventId/matches/:matchId`
- **THEN** the match SHALL be removed from the list

#### Scenario: Admin cancels deletion

- **WHEN** admin clicks cancel in the confirmation dialog
- **THEN** the match SHALL remain unchanged

### Requirement: Admin can clear all matches for a sport type

Admin SHALL be able to delete all matches of the current `matchType` for the selected event in a single action. The system SHALL prompt for confirmation. The backend SHALL expose `DELETE /api/v1/events/:eventId/matches?matchType=` restricted to `admin` role.

#### Scenario: Admin clears all matches of a type

- **WHEN** admin clicks "清空全部" and confirms
- **THEN** the system SHALL call `DELETE /api/v1/events/:eventId/matches?matchType=<current>`
- **THEN** the match list SHALL be empty

#### Scenario: Clear all with matchType filter

- **WHEN** `DELETE /api/v1/events/:eventId/matches` is called with `?matchType=ne-waza`
- **THEN** only matches with `matchType === 'ne-waza'` for that event SHALL be deleted
- **THEN** matches of other types SHALL remain unaffected

### Requirement: Backend exposes DELETE endpoints for matches

The backend SHALL provide two DELETE endpoints for match management, both restricted to `admin` role:

- `DELETE /api/v1/events/:eventId/matches/:matchId` — delete a single match
- `DELETE /api/v1/events/:eventId/matches` — delete all matches for an event, with optional `?matchType=` query filter

#### Scenario: Delete single match

- **WHEN** `DELETE /api/v1/events/:eventId/matches/:matchId` is called by admin
- **THEN** the match SHALL be permanently deleted from the database
- **THEN** the response SHALL return `{ success: true }`

#### Scenario: Delete single match not found

- **WHEN** `DELETE /api/v1/events/:eventId/matches/:matchId` is called with a non-existent ID
- **THEN** the response SHALL return HTTP 404 with `{ success: false, error: '找不到場次' }`

#### Scenario: Bulk delete with matchType filter

- **WHEN** `DELETE /api/v1/events/:eventId/matches?matchType=fighting` is called by admin
- **THEN** all matches with `matchType === 'fighting'` for that event SHALL be deleted
- **THEN** the response SHALL return `{ success: true, deleted: <count> }`

#### Scenario: Bulk delete without matchType filter

- **WHEN** `DELETE /api/v1/events/:eventId/matches` is called without `?matchType=`
- **THEN** all matches for that event SHALL be deleted
- **THEN** the response SHALL return `{ success: true, deleted: <count> }`
