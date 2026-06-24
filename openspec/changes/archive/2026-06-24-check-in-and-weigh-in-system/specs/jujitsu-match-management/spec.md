## ADDED Requirements

### Requirement: Referee match detail view displays participant eligibility badges

The fighting-referee, ne-waza-referee, and contact-referee match detail views SHALL display an eligibility badge next to each side's player name. The badge content SHALL be derived from the corresponding `Team.members[]` entry that matches `redPlayer` / `bluePlayer` by `(name, teamName)`:

| Member status | Badge label | Badge style |
|---|---|---|
| `weighInStatus === 'failed'` | ❌ 過磅失格 | `bg-red-500/20 text-red-300` |
| `checkInStatus === 'absent'` | ⛔ 檢錄未到 | `bg-red-500/20 text-red-300` |
| `checkInStatus === 'present'` AND `weighInStatus ∈ {'passed', 'n/a'}` | ✅ 已檢錄 | `bg-emerald-500/20 text-emerald-300` |
| Any other state (pending) | ⚠️ 未檢錄 | `bg-white/10 text-white/60` |

The badge SHALL update in real time when the referee component receives a `participant:status-changed` Socket.IO event whose `(teamName, memberName)` matches a player in the currently displayed match.

When no corresponding `Team.members[]` entry can be located (e.g., bye match with empty bluePlayer.name), the badge SHALL be omitted for that side.

#### Scenario: Red player has failed weigh-in

- **WHEN** the ne-waza referee opens a match whose `redPlayer = {name: 'A', teamName: 'TeamX'}` and the corresponding Team member has `weighInStatus: 'failed'`
- **THEN** the red side header SHALL display a `❌ 過磅失格` badge

#### Scenario: Live update on participant status change

- **GIVEN** the fighting referee is viewing a match with the red side currently showing `⚠️ 未檢錄`
- **WHEN** a `participant:status-changed` event arrives for that red side member with `checkInStatus: 'present'` and `weighInStatus: 'passed'`
- **THEN** within one Socket.IO round-trip the red side badge SHALL transition to `✅ 已檢錄`

#### Scenario: Bye match omits badge for empty blue side

- **WHEN** a ne-waza match has `isBye: true` and `bluePlayer.name === ''`
- **THEN** no eligibility badge SHALL be rendered on the blue side

### Requirement: Member ineligibility triggers automatic match forfeit and propagation

When a Team member transitions to `weighInStatus: 'failed'` or `checkInStatus: 'absent'` via the participant management endpoints, the backend SHALL automatically:

1. Locate every Match document in the same event with `status: 'pending'` that lists this member as `redPlayer` (matched by `name` AND `teamName`) or `bluePlayer`.
2. Update each such match to `isBye: true`, `result: { winner: <opposite side>, method: 'dq' }`, `status: 'completed'`.
3. Invoke the existing `updateMatchPropagation` helper for each newly completed match so any downstream match referencing it via `redSource.fromMatchNo` or `blueSource.fromMatchNo` advances the new winner.
4. Emit a single `match:forfeit-applied` Socket.IO event to the event room with payload `{ forfeitedMatchIds: string[], propagatedMatchIds: string[], reason: 'weigh-in-failed' | 'check-in-absent' }`.

Matches with `status: 'in-progress'` SHALL NOT be auto-modified; the participant endpoint response SHALL include a `skippedMatchIds` field listing them so the operator is informed.

#### Scenario: Failed weigh-in forfeits multiple pending matches

- **GIVEN** event E with two pending matches M1 (`redPlayer: A`, `bluePlayer: B`) and M2 (`bluePlayer: A`, `redPlayer: C`)
- **WHEN** member A is marked `weighInStatus: 'failed'`
- **THEN** M1 SHALL be updated to `{ isBye: true, status: 'completed', result: { winner: 'blue', method: 'dq' } }`
- **AND** M2 SHALL be updated to `{ isBye: true, status: 'completed', result: { winner: 'red', method: 'dq' } }`
- **AND** the broadcast `match:forfeit-applied` SHALL list both `M1._id` and `M2._id` in `forfeitedMatchIds`

#### Scenario: Forfeit propagation advances bracket

- **GIVEN** M1 (`redPlayer: A`, status pending) and M3 (`redSource.fromMatchNo: M1.matchNo`, status pending)
- **WHEN** member A is marked absent at check-in
- **THEN** M1 SHALL be forfeited (blue wins)
- **AND** M3's `redPlayer` SHALL be replaced by M1's blue side via `updateMatchPropagation`
- **AND** `match:forfeit-applied` SHALL include M1 in `forfeitedMatchIds` AND M3 in `propagatedMatchIds`

#### Scenario: In-progress match is reported as skipped

- **GIVEN** member A is participating in one pending match M1 and one in-progress match M2
- **WHEN** member A is marked absent
- **THEN** M1 SHALL be forfeited
- **AND** M2 SHALL remain `status: 'in-progress'` with no modification
- **AND** the controller response SHALL include `skippedMatchIds: [M2._id]`
