## ADDED Requirements

### Requirement: Event creation form offers competition type selection

The Event creation form in the admin dashboard SHALL include a competition type selector with exactly two options: "宜蘭縣運動會" (`sports-day`, default) and "宜蘭縣柔術錦標賽" (`tournament`). The selection SHALL be persisted to the Event's `competitionType` field. The field SHALL NOT be editable after Event creation; admin SHALL create a new Event to change competition type.

#### Scenario: Admin creates a tournament event from the event creation form

- **WHEN** admin selects "宜蘭縣柔術錦標賽" in the competition type selector and submits the form
- **THEN** the system SHALL persist `competitionType: 'tournament'` to the new Event document and the field SHALL be hidden or shown as read-only in subsequent edit forms

#### Scenario: Existing event without competitionType displays as sports-day

- **WHEN** admin opens the edit form for an existing Event that was created before this change
- **THEN** the competition type SHALL be displayed as "宜蘭縣運動會" (read-only) and the underlying `competitionType` SHALL be persisted as `'sports-day'` on next save
