## ADDED Requirements

### Requirement: Admin can create a new user account

The system SHALL provide an account creation form on the judge management page. The admin SHALL be able to specify username (required), password (required), and role (required, selected from a predefined list). On successful creation, the new account SHALL appear in the user list immediately.

#### Scenario: Admin creates a new account

- **WHEN** admin fills in username, password, and selects a role, then submits the form
- **THEN** the system SHALL call `POST /api/v1/auth/register` with the provided data
- **THEN** the new account SHALL appear in the user list
- **THEN** a success toast notification SHALL be shown

#### Scenario: Admin submits without required fields

- **WHEN** admin submits the creation form with any required field empty
- **THEN** the system SHALL NOT call the API
- **THEN** the system SHALL show a validation warning

### Requirement: Admin can change a user's role inline

The system SHALL allow the admin to change a user's role directly in the user list without navigating to a separate page. Only one row SHALL be in edit mode at a time.

#### Scenario: Admin edits a user's role

- **WHEN** admin clicks the edit button on a user row
- **THEN** the row SHALL display a role dropdown with the current role selected
- **WHEN** admin selects a new role and confirms
- **THEN** the system SHALL call `PATCH /api/v1/auth/users/:id/role` with the new role
- **THEN** the row SHALL return to read-only display with the updated role

#### Scenario: Admin cancels role edit

- **WHEN** admin clicks cancel during inline edit
- **THEN** the row SHALL return to read-only display with the original role unchanged

### Requirement: Admin can delete a user account

The system SHALL allow the admin to delete a user account from the user list. The system SHALL require confirmation before deletion. An admin SHALL NOT be able to delete their own account.

#### Scenario: Admin deletes a user account

- **WHEN** admin clicks the delete button on a user row and confirms the dialog
- **THEN** the system SHALL call `DELETE /api/v1/auth/users/:id`
- **THEN** the user SHALL be removed from the list
- **THEN** a success toast notification SHALL be shown

#### Scenario: Admin attempts to delete own account

- **WHEN** admin clicks delete on their own account row
- **THEN** the system SHALL return a 400 error
- **THEN** the system SHALL display an error message

### Requirement: Role selection is limited to authenticated roles

The role dropdown SHALL only offer the following options: `scoring_judge` (計分裁判), `vr_judge` (VR 裁判), `sequence_judge` (賽序裁判), `match_referee` (場次裁判), `admin` (管理員). The `audience` role SHALL NOT be selectable as audiences do not require login.
