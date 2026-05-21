## ADDED Requirements

### Requirement: Ne-Waza default match duration depends on tier under tournament events

Under tournament events, Ne-Waza match creation SHALL apply a tier-dependent default match duration in seconds:

| Tier | Default duration |
| ---- | ---------------- |
| ELEM | 120 seconds (2 minutes) |
| JH   | 180 seconds (3 minutes) |
| SH   | 180 seconds (3 minutes) |
| OPEN | 300 seconds (5 minutes) |

The referee SHALL be able to override the default before starting the match using the existing match duration setup UI. Under sports-day events, the existing default (180 seconds, with referee override) SHALL be preserved unchanged.

#### Scenario: Tournament ELEM match defaults to 2 minutes

- **WHEN** admin creates a Ne-Waza match for a tournament event with `tier: 'ELEM'`
- **THEN** the persisted Match document SHALL have `matchDuration: 120` and the referee setup UI SHALL display "2:00" as the default

#### Scenario: Tournament JH match defaults to 3 minutes

- **WHEN** admin creates a Ne-Waza match for a tournament event with `tier: 'JH'`
- **THEN** the persisted Match document SHALL have `matchDuration: 180` and the referee setup UI SHALL display "3:00"

#### Scenario: Tournament SH match defaults to 3 minutes

- **WHEN** admin creates a Ne-Waza match for a tournament event with `tier: 'SH'`
- **THEN** the persisted Match document SHALL have `matchDuration: 180` and the referee setup UI SHALL display "3:00"

#### Scenario: Tournament OPEN match defaults to 5 minutes

- **WHEN** admin creates a Ne-Waza match for a tournament event with `tier: 'OPEN'`
- **THEN** the persisted Match document SHALL have `matchDuration: 300` and the referee setup UI SHALL display "5:00"

##### Example: tier to default duration mapping

| Tier | Default `matchDuration` (seconds) | Display |
| ---- | --------------------------------- | ------- |
| ELEM | 120 | 2:00 |
| JH   | 180 | 3:00 |
| SH   | 180 | 3:00 |
| OPEN | 300 | 5:00 |

#### Scenario: Sports-day Ne-Waza match preserves existing default

- **WHEN** admin creates a Ne-Waza match for a sports-day event (no tier)
- **THEN** the persisted Match document SHALL have `matchDuration: 180` (existing default), unchanged from pre-change behavior

#### Scenario: Referee overrides tier default

- **WHEN** admin creates a tournament ELEM Ne-Waza match and the referee adjusts the duration to 90 seconds before starting
- **THEN** the system SHALL persist the override and the match SHALL run for 90 seconds
