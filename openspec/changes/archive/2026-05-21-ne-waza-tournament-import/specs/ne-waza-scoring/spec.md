## MODIFIED Requirements

### Requirement: Ne-Waza default match duration depends on tier under tournament events

Under tournament events, Ne-Waza match creation SHALL apply a tier-dependent default match duration in seconds:

| Tier | Default duration |
| ---- | ---------------- |
| KID  | 90 seconds (1 minute 30 seconds) |
| EL   | 120 seconds (2 minutes) |
| EM   | 120 seconds (2 minutes) |
| EH   | 120 seconds (2 minutes) |
| JH   | 180 seconds (3 minutes) |
| SH   | 180 seconds (3 minutes) |
| OPEN | 300 seconds (5 minutes) |

The referee SHALL be able to override the default before starting the match using the existing match duration setup UI. Under sports-day events, the existing default (180 seconds, with referee override) SHALL be preserved unchanged.

The `MatchTier` enum SHALL be `KID | EL | EM | EH | JH | SH | OPEN`. The legacy value `ELEM` SHALL NOT be accepted; any existing Match document with `tier: "ELEM"` SHALL be migrated to one of the new tier codes via the `migrateNeWazaTier` seed script before deployment.

#### Scenario: Tournament KID match defaults to 90 seconds

- **WHEN** admin creates a Ne-Waza match for a tournament event with `tier: 'KID'`
- **THEN** the persisted Match document SHALL have `matchDuration: 90` and the referee setup UI SHALL display "1:30" as the default

#### Scenario: Tournament EL/EM/EH match defaults to 2 minutes

- **WHEN** admin creates a Ne-Waza match for a tournament event with `tier: 'EL'`, `tier: 'EM'`, or `tier: 'EH'`
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
| KID  | 90 | 1:30 |
| EL   | 120 | 2:00 |
| EM   | 120 | 2:00 |
| EH   | 120 | 2:00 |
| JH   | 180 | 3:00 |
| SH   | 180 | 3:00 |
| OPEN | 300 | 5:00 |

#### Scenario: Sports-day Ne-Waza match preserves existing default

- **WHEN** admin creates a Ne-Waza match for a sports-day event (no tier)
- **THEN** the persisted Match document SHALL have `matchDuration: 180` (existing default), unchanged from pre-change behavior

#### Scenario: Referee overrides tier default

- **WHEN** admin creates a tournament KID Ne-Waza match and the referee adjusts the duration to 60 seconds before starting
- **THEN** the system SHALL persist the override and the match SHALL run for 60 seconds

#### Scenario: Legacy ELEM tier is rejected

- **WHEN** any caller POSTs a Match creation request with `tier: 'ELEM'`
- **THEN** the system SHALL reject the request with HTTP 400 and the error `tier "ELEM" 已停用，請改用 EL / EM / EH 之一`

## ADDED Requirements

### Requirement: Referee can complete a bye match directly without timer

For a Match document with `isBye === true`, `bluePlayer.name === ""`, and `status === "pending"`, the `ne-waza-referee` UI SHALL enable the "紅方勝" action button immediately upon entering the match — without requiring the referee to press the start-match button or start the timer first.

When the referee presses "紅方勝" on such a bye match, the system SHALL PATCH `/api/v1/matches/:matchId` with `{ status: "completed", result: { winner: "red", method: "judge" } }` in a single request.

The system SHALL NOT enable this shortcut on matches with `isBye === false`. For non-bye matches, the existing flow (`pending → in-progress → completed`) SHALL apply unchanged.

For bye matches completed via this shortcut, the system SHALL NOT create any MatchScoreLog entries (no scoring events occurred). Propagation to downstream sourced matches SHALL still be triggered as described in the `jujitsu-match-management` capability.

#### Scenario: Bye match shows enabled red-win button immediately

- **GIVEN** Match #1 has `isBye = true`, `redPlayer.name = "董子璿"`, `redPlayer.teamName = "Jabari"`, `bluePlayer.name = ""`, `bluePlayer.teamName = ""`, `status = "pending"`
- **WHEN** match_referee opens Match #1 in the ne-waza-referee UI
- **THEN** the "紅方勝" action button SHALL be enabled
- **AND** the start-match button SHALL be hidden or disabled
- **AND** the timer SHALL NOT auto-start

#### Scenario: Bye match completes in a single click

- **GIVEN** the bye Match #1 above
- **WHEN** match_referee clicks "紅方勝"
- **THEN** the system PATCHes Match #1 with `status: "completed"`, `result: { winner: "red", method: "judge" }`
- **AND** Match #1 transitions to `completed` in a single state change
- **AND** any Match with `redSource.fromMatchNo = 1` or `blueSource.fromMatchNo = 1` is propagated via the advancement-resolved mechanism

#### Scenario: Non-bye match does not show the shortcut

- **GIVEN** Match #3 has `isBye = false`, both players have non-empty names, `status = "pending"`
- **WHEN** match_referee opens Match #3
- **THEN** the "紅方勝" button SHALL be disabled until the referee clicks start-match and the match transitions to `in-progress`
