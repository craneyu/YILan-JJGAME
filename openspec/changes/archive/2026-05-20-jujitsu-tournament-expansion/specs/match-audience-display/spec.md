## ADDED Requirements

### Requirement: Audience display header includes tier label for tournament events

For tournament event teams, the audience display header SHALL render the tier label between the category label and the round/group indicators. The tier label SHALL be the uppercase tier code (e.g., `EL`, `EM`, `EH`, `JH`, `OPEN`, `ELEM`). For sports-day event teams (tier=null), the header SHALL remain unchanged from existing behavior (no tier label rendered).

#### Scenario: Tournament multi-team group header

- **WHEN** audience display loads for a tournament event team with `category: 'male'`, `tier: 'JH'`, in round 1 and group position 2
- **THEN** the header SHALL render exactly `MALE JH R1-G2` with the tier label between category and round-group

#### Scenario: Sports-day header unchanged

- **WHEN** audience display loads for a sports-day event team with `category: 'female'`, `tier: null`, in round 2, group position 1
- **THEN** the header SHALL render exactly `FEMALE R2-G1` (no tier segment), byte-identical to pre-change behavior

##### Example: header rendering variants

| Event type | Category | Tier | Round | Group | Single-team group? | Rendered header |
| ---------- | -------- | ---- | ----- | ----- | ------------------ | --------------- |
| tournament | male | JH | 1 | 2 | no | `MALE JH R1-G2` |
| tournament | female | OPEN | 3 | 1 | no | `FEMALE OPEN R3-G1` |
| tournament | male | EH | 1 | 1 | yes | `MALE EH` |
| tournament | mixed | JH | 2 | 1 | yes | `MIXED JH` |
| sports-day | male | (null) | 1 | 2 | no | `MALE R1-G2` |
| sports-day | female | (null) | 2 | 1 | no | `FEMALE R2-G1` |

### Requirement: Ranking table omits unused motion columns based on tier

For tournament event teams whose `tier` is `EL` or `EM`, the audience ranking table SHALL render motion columns only for the motions the tier performs (per the elementary motion-set rules). C series columns SHALL NOT be rendered for EL or EM teams. For `EH` teams, all three series columns SHALL be rendered but only 3 columns per series (A1-A3, B1-B3, C1-C3) instead of the standard 4. For `JH`, `OPEN`, and sports-day teams, existing column rendering SHALL be preserved.

#### Scenario: EL team ranking table

- **WHEN** audience display loads a ranking for an EL team
- **THEN** the visible motion columns SHALL be exactly `A1, B1` plus the existing summary columns; no C series header SHALL be rendered

#### Scenario: Female JH team ranking table shows 3 motions per series

- **WHEN** audience display loads a ranking for a female JH team
- **THEN** the visible motion columns SHALL be exactly `A1, A2, A3, B1, B2, B3, C1, C2, C3` (3 per series), and the system SHALL NOT render `A4`, `B4`, or `C4` columns
