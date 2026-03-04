## MODIFIED Requirements

### Requirement: Admin can create and manage creative embu events

The admin dashboard SHALL allow the admin to create events that support one or both competition types (`Duo` and `Show`). When creating an event, the admin SHALL select which competition types to enable using a multi-select checkbox group. An event SHALL support `competitionTypes: ('Duo' | 'Show')[]` with a minimum of one type selected. The `Event` model SHALL use `competitionTypes` array instead of a single `competitionType` value, implementing the "Event 模型改用 competitionTypes 陣列" design decision. Both `game_states` and `creative_game_states` SHALL remain independent collections — implementing "game_states 與 creative_game_states 維持各自獨立" — each initialized only when their respective type is enabled.

#### Scenario: Admin creates an event with both Duo and Show types

- **WHEN** the admin selects both "雙人演武" and "創意演武" checkboxes and submits the event creation form
- **THEN** the system SHALL create an event with `competitionTypes: ['Duo', 'Show']` and initialize both a `/game_states` document and a `/creative_game_states` document for that event

#### Scenario: Admin creates an event with only Duo type

- **WHEN** the admin selects only "雙人演武" and submits the event creation form
- **THEN** the system SHALL create an event with `competitionTypes: ['Duo']` and initialize only a `/game_states` document

#### Scenario: Admin views a unified event with both types

- **WHEN** the admin opens an event whose `competitionTypes` includes both `'Duo'` and `'Show'`
- **THEN** the event card SHALL display two distinct sections: a "雙人演武" section and a "創意演武" section, each with their own team list, score summary, rankings, and export buttons

---

### Requirement: Admin can import teams for creative events

The admin SHALL be able to import teams for each competition type separately within the same event, following the "Admin 隊伍匯入：分軌操作而非 CSV 新增欄位" design decision. The CSV format SHALL remain unchanged (`Team Name, Member 1, Member 2, Category`). The admin SHALL use separate import buttons or sections for `Duo` teams and `Show` teams. The backend SHALL accept a `competitionType` parameter on `POST /events/:id/teams/import` to tag imported teams accordingly.

#### Scenario: Admin imports Duo teams

- **WHEN** the admin clicks the "匯入雙人演武隊伍" import button in the Duo section and uploads a CSV file
- **THEN** all imported teams SHALL be created with `competitionType: 'Duo'` associated with that event, with duplicate name validation

#### Scenario: Admin imports Show teams

- **WHEN** the admin clicks the "匯入創意演武隊伍" import button in the Show section and uploads a CSV file
- **THEN** all imported teams SHALL be created with `competitionType: 'Show'` associated with that event, with duplicate name validation

---

### Requirement: Admin can view creative embu rankings

The admin SHALL be able to view rankings for both Duo and Show competition types within a single event card. Rankings SHALL be grouped by category (male/female/mixed) within each competition type section. Export buttons (Excel and PDF) SHALL be available per category per competition type.

#### Scenario: Admin views Duo rankings in unified event

- **WHEN** the admin opens the Duo rankings section of a unified event
- **THEN** teams with `competitionType: 'Duo'` SHALL be ranked by total score descending within each category

#### Scenario: Admin views Show rankings in unified event

- **WHEN** the admin opens the Show rankings section of a unified event
- **THEN** teams with `competitionType: 'Show'` SHALL be ranked by `finalScore` descending within each category, using the creative scoring formula
