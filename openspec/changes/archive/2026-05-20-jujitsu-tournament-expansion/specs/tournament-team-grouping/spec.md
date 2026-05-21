## ADDED Requirements

### Requirement: Event distinguishes competition type

The Event model SHALL declare which competition format it follows via a `competitionType` field. The field SHALL be either `sports-day` (existing 宜蘭縣運動會 behavior, default for backward compatibility) or `tournament` (新增的宜蘭縣柔術錦標賽 behavior). All tournament-specific rules defined in subsequent requirements SHALL apply only when `event.competitionType === 'tournament'`.

#### Scenario: Existing event defaults to sports-day

- **WHEN** an existing Event document loaded from the database has no `competitionType` field
- **THEN** the system SHALL treat it as `competitionType: 'sports-day'` and preserve all existing 宜蘭縣運動會 behavior unchanged

#### Scenario: Admin creates a tournament event

- **WHEN** admin creates an Event via `POST /api/v1/events` with body `{ competitionType: 'tournament', ... }`
- **THEN** the system SHALL persist the field and all tournament rules SHALL apply to Teams and Matches under this Event

### Requirement: Team carries a tier (age/level) classification under tournament events

Under `tournament` events, every Team SHALL declare a `tier` field selected from the set `{ EL, EM, EH, JH, SH, OPEN, ELEM }`. Under `sports-day` events, the `tier` field SHALL remain null and SHALL be ignored by all consumers.

The tier codes map to age/level divisions as follows:

| Code | Division | Applies to |
| ---- | -------- | ---------- |
| EL   | 國小低年級 | Duo (傳統演武), Show (創意演武) |
| EM   | 國小中年級 | Duo, Show |
| EH   | 國小高年級 | Duo, Show |
| JH   | 青少年國中組 | Duo, Show, Ne-Waza |
| SH   | 青少年高中組 | Duo, Show, Ne-Waza |
| OPEN | 公開組 | Duo, Show, Ne-Waza |
| ELEM | 國小組（寢技專用） | Ne-Waza |

#### Scenario: Importing teams to a tournament event requires tier

- **WHEN** admin uploads a team-import Excel for a tournament event and any row is missing the `tier` column
- **THEN** the system SHALL reject the import with HTTP 400 and the error message SHALL identify which rows are missing tier

#### Scenario: Importing teams to a sports-day event ignores tier

- **WHEN** admin uploads a team-import Excel for a sports-day event with a `tier` column present
- **THEN** the system SHALL accept the import, ignore the tier column, and store `tier: null` for all rows

### Requirement: Ranking groups partition by category and tier

Ranking calculations SHALL group teams by the composite key `(category, tier)`. Each `(category, tier)` group SHALL produce an independent ranking list. For sports-day events where all tiers are null, the grouping SHALL degenerate to `(category, null)` and behave identically to the existing per-category ranking.

#### Scenario: Tournament event ranks by category × tier

- **WHEN** `GET /api/v1/events/:id/rankings` is called for a tournament event containing 6 male teams (3 EH, 3 JH) and 4 female teams (2 EH, 2 OPEN)
- **THEN** the response SHALL contain 4 separate ranking groups: `male×EH` (3 teams), `male×JH` (3 teams), `female×EH` (2 teams), `female×OPEN` (2 teams)

##### Example: tournament ranking groups

| Group key | Teams in group |
| --------- | -------------- |
| `male:EH` | M1, M2, M3 |
| `male:JH` | M4, M5, M6 |
| `female:EH` | F1, F2 |
| `female:OPEN` | F3, F4 |

#### Scenario: Sports-day event ranks by category only

- **WHEN** `GET /api/v1/events/:id/rankings` is called for a sports-day event
- **THEN** the response SHALL group teams by `category` alone (tier=null collapses) and the output SHALL be byte-identical to the pre-change ranking output

### Requirement: Ne-Waza match carries tier classification

Under `tournament` events, every Ne-Waza Match SHALL declare a `tier` field from the set `{ ELEM, JH, SH, OPEN }`. Under `sports-day` events, the field SHALL be null.

#### Scenario: Creating a Ne-Waza match without tier under tournament event

- **WHEN** admin creates a Ne-Waza match via `POST /api/v1/events/:id/matches` for a tournament event without specifying `tier`
- **THEN** the system SHALL reject the request with HTTP 400 and error message identifying the missing tier
