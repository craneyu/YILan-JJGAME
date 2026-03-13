## MODIFIED Requirements

### Requirement: Judge management page supports full account CRUD

The judge management page at `/admin/judges` SHALL be extended to support creating new accounts, editing roles inline, and deleting accounts, in addition to the existing password change and event assignment capabilities.

#### Scenario: Admin sees create account form

- **WHEN** admin visits `/admin/judges`
- **THEN** the page SHALL display a "新增帳號" button
- **WHEN** admin clicks the button
- **THEN** a form SHALL expand with username, password, and role dropdown fields

#### Scenario: Admin sees inline role edit

- **WHEN** admin clicks the edit icon on a user row
- **THEN** that row SHALL display a role dropdown in place of the role badge
- **THEN** all other rows SHALL remain in read-only mode
