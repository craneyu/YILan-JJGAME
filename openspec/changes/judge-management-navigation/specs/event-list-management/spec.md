## ADDED Requirements

### Requirement: Admin can navigate to judge management from the event list page

The event list page (`/admin/events`) SHALL provide a "裁判管理" button in the header action area. Clicking the button SHALL navigate to `/admin/judges`.

#### Scenario: Admin clicks judge management button on event list page

- **WHEN** admin is on `/admin/events` and clicks the "裁判管理" button
- **THEN** the system SHALL navigate to `/admin/judges`
