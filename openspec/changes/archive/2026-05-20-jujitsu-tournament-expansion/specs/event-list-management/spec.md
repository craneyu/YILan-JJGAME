## ADDED Requirements

### Requirement: Event model includes competition type field

The Event Mongoose model SHALL include a `competitionType` field of type string with allowed values `'sports-day'` or `'tournament'` and default value `'sports-day'`. The field SHALL be required at the schema level (with the default ensuring backward compatibility for existing documents).

#### Scenario: Legacy event document loaded from database

- **WHEN** an Event document persisted before this change is loaded via Mongoose
- **THEN** the `competitionType` field SHALL resolve to `'sports-day'` through the schema default without requiring data migration

#### Scenario: Tournament event creation persists field

- **WHEN** `POST /api/v1/events` is called with `{ name: '柔術錦標賽 2026', competitionType: 'tournament' }`
- **THEN** the persisted document SHALL contain `competitionType: 'tournament'`

### Requirement: Event list distinguishes competition type

The event list page SHALL render a visible label or badge on each event card indicating its competition type. The label SHALL read "運動會" for `sports-day` events and "錦標賽" for `tournament` events.

#### Scenario: Event list shows tournament badge

- **WHEN** the event list contains both sports-day and tournament events
- **THEN** each event card SHALL display its respective competition type label, allowing admin to visually distinguish the two types
