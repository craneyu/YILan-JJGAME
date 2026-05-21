## ADDED Requirements

### Requirement: Elementary tier teams exempt from creative time penalty

Under tournament events, creative-embu time-based penalties (overtime and undertime, each -1 point) SHALL NOT apply to teams whose `tier` is `EL`, `EM`, or `EH`. Other penalty types (props usage, insufficient attacks, etc.) SHALL continue to apply unchanged for elementary tier teams. For sports-day events and for non-elementary tournament tiers (JH, OPEN), time-based penalties SHALL apply as in the existing behavior.

The backend `creativeScoring` utility SHALL check the team's tier before applying the time-based deduction. The creative scoring judge interface SHALL hide or visually disable the "overtime" / "undertime" indicators when the active team's tier is elementary.

#### Scenario: Elementary team performs overtime without penalty

- **WHEN** a tournament event EL team performs creative embu for 2 minutes 30 seconds (30 seconds over the standard 2-minute limit) and the scoring judges submit their scores
- **THEN** the calculated final score SHALL NOT include the -1 overtime deduction, and the audience display SHALL NOT show an overtime warning indicator

##### Example: penalty matrix

| Event type | Tier | Time penalty applies? | Other penalties? |
| ---------- | ---- | --------------------- | ---------------- |
| sports-day | (n/a) | Yes | Yes |
| tournament | EL | No | Yes |
| tournament | EM | No | Yes |
| tournament | EH | No | Yes |
| tournament | JH | Yes | Yes |
| tournament | OPEN | Yes | Yes |

#### Scenario: JH team in tournament still penalized for overtime

- **WHEN** a tournament event JH team performs creative embu 30 seconds over the 2-minute limit
- **THEN** the final score SHALL include the -1 overtime deduction (existing behavior preserved for non-elementary tournament tiers)
