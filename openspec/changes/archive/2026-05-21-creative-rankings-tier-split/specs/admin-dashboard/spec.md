## MODIFIED Requirements

### Requirement: Admin can view creative embu rankings

The admin SHALL be able to view rankings for both Duo and Show competition types within a single event card.

For sports-day events, rankings SHALL be grouped by `category` (male/female/mixed) within each competition type section. Export buttons (Excel and PDF) SHALL be available per category per competition type.

For tournament events (where `Event.meetingType === "tournament"`), Show rankings SHALL be grouped by `(category, tier)` rather than `category` alone, mirroring the existing Duo behavior. Each `(category, tier)` group SHALL be ranked independently — teams in `(female, EL)` are ranked separately from teams in `(female, OPEN)`. Export buttons (Excel and PDF) SHALL be available per `(category, tier)` group.

The `GET /api/v1/events/:id/creative-rankings` endpoint SHALL include `tier: string | null` in each returned ranking entry. For sports-day events (or teams without a tier value), `tier` SHALL be `null`.

#### Scenario: Admin views Duo rankings in unified event

- **WHEN** the admin opens the Duo rankings section of a unified event
- **THEN** teams with `competitionType: 'Duo'` SHALL be ranked by total score descending within each category

#### Scenario: Admin views Show rankings in sports-day event

- **WHEN** the admin opens the Show rankings section of a sports-day event
- **THEN** teams with `competitionType: 'Show'` SHALL be ranked by `finalScore` descending within each `category` only
- **AND** each ranking entry's `tier` field SHALL be `null`

#### Scenario: Admin views Show rankings in tournament event with multiple tiers

- **GIVEN** a tournament event with Show teams in `(female, EL)`, `(female, OPEN)`, and `(male, JH)`
- **WHEN** the admin opens the Show rankings section
- **THEN** the UI SHALL display three separate ranking groups, one per `(category, tier)` pair
- **AND** each group SHALL show its own rank 1, 2, 3… computed independently
- **AND** each group label SHALL display both category and tier (e.g., `女子組 ｜ 國小低年級組`)

#### Scenario: Single team in a (category, tier) group still receives rank 1

- **GIVEN** a tournament event with exactly one Show team in `(male, KID)` (no other teams in the same tier)
- **WHEN** the admin opens the Show rankings section
- **THEN** that team SHALL appear in a `男子組 ｜ 幼兒組` group with rank 1

#### Scenario: Show export button is provided per (category, tier) group in tournament

- **GIVEN** a tournament event with Show teams in `(female, EL)` and `(female, OPEN)`
- **WHEN** the admin views the Show rankings section
- **THEN** the UI SHALL provide an Excel export button for each `(category, tier)` group (two buttons in this example)
- **AND** clicking `(female, EL)` export SHALL produce a file named `女子組_國小低年級.xlsx` containing only the female EL teams
- **AND** clicking `(female, OPEN)` export SHALL produce a file named `女子組_公開組.xlsx` containing only the female OPEN teams

#### Scenario: Show export in sports-day event keeps single-file-per-category

- **GIVEN** a sports-day event with Show teams across male, female, mixed
- **WHEN** the admin clicks the Show Excel export button for the female category
- **THEN** the system SHALL produce a single file `女子組.xlsx` containing all female Show teams, matching pre-change behavior
