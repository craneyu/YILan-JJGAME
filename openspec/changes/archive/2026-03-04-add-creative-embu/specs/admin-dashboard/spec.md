## ADDED Requirements

### Requirement: Admin can create and manage creative embu events

The admin dashboard SHALL allow the admin to create events with `competitionType: 'creative'`. When creating an event, the admin SHALL select the competition type. Creative events SHALL be listed separately from kata events or filtered by type.

#### Scenario: Admin creates a creative embu event

- **WHEN** the admin selects "創意演武" as competition type and submits the event creation form
- **THEN** the system SHALL create an event with `competitionType: 'creative'` in `/events` and initialize a `/creative_game_states` document for that event

#### Scenario: Admin views creative events separately

- **WHEN** the admin visits the admin dashboard
- **THEN** events SHALL be grouped or filterable by `competitionType`, showing kata and creative events distinctly

### Requirement: Admin can import teams for creative events

The admin SHALL be able to import teams for creative events using the same CSV/Excel format as kata events. The import format remains: `Team Name, Member 1, Member 2, Category`.

#### Scenario: Team import for creative event

- **WHEN** the admin imports a CSV file for a creative event
- **THEN** the teams SHALL be created in `/teams` associated with the creative `eventId`, with duplicate name validation

### Requirement: Admin can view creative embu rankings

The admin SHALL be able to view rankings for creative events, showing: rank, team name, members, technical total, artistic total, grand total, penalty deduction, and final score, grouped by category.

#### Scenario: Admin views creative rankings by category

- **WHEN** the admin opens rankings for a creative event
- **THEN** teams SHALL be ranked by `finalScore` (descending) within each category (male/female/mixed), with tied scores ordered by submission time

### Requirement: Admin can export creative embu results

The admin SHALL be able to export results for creative events. Two export formats SHALL be supported:
- **Excel (.xlsx)**: Per-category sheet with rank, team name, members, technicalTotal, artisticTotal, grandTotal, penaltyDeduction, finalScore, penalty type notes
- **PDF**: Per-category printable format with all teams ranked, chief judge signature area, A4 landscape orientation

#### Scenario: Admin exports Excel for creative event

- **WHEN** the admin clicks the Excel export button for a creative event category
- **THEN** the system SHALL download an `.xlsx` file with the category's ranked results including all score fields

#### Scenario: Admin exports PDF for creative event

- **WHEN** the admin clicks the PDF export button for a creative event category
- **THEN** the system SHALL download an A4 landscape PDF with ranked teams and a signature area
