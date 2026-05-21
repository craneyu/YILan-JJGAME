## MODIFIED Requirements

### Requirement: Admin can create matches via CSV/Excel import

The system SHALL allow Admin to import match schedules by uploading a CSV or Excel file through the Admin dashboard.

The import file SHALL contain the following columns: `項目` (matchType), `組別` (category), `分級` (tier), `量級` (weightClass), `回合` (round), `場次序` (matchNo/scheduledOrder), `紅方姓名` (redPlayerName), `紅方隊名` (redTeamName), `藍方姓名` (bluePlayerName), `藍方隊名` (blueTeamName).

Valid values for `項目` SHALL be: `ne-waza`, `fighting`, `contact`.

Valid values for `組別` SHALL be: `male`, `female`, `mixed`.

For `項目 = ne-waza`, valid values for `分級` SHALL be one of these Chinese labels and SHALL be mapped to the corresponding `MatchTier` code:

| Chinese label | MatchTier code |
| --- | --- |
| 幼兒組 | KID |
| 國小低年級組 | EL |
| 國小中年級組 | EM |
| 國小高年級組 | EH |
| 青少年國中組 | JH |
| 青少年高中組 | SH |
| 公開組 | OPEN |

The system SHALL use `Number(場次序)` as both `matchNo` and `scheduledOrder` on the created Match document. The system SHALL NOT use the row index `i + 1` as a fallback when `場次序` is missing — a missing or non-positive `場次序` value SHALL reject that row with an error message.

For ne-waza imports, when `紅方姓名` or `藍方姓名` matches the pattern `^\s*(\d+)\s*勝\s*$`, the system SHALL:

1. Parse the integer `N` from the placeholder.
2. Set the corresponding side's `redSource` or `blueSource` field on the Match document to `{ fromMatchNo: N, resolved: false }`.
3. Set the corresponding `redPlayer.name` or `bluePlayer.name` to the display string `"N 勝者"` (a space between N and 勝者) and `teamName` to an empty string `""`.

For ne-waza imports, when `藍方姓名` is empty, the system SHALL set `bluePlayer.name = ""`, `bluePlayer.teamName = ""`, `isBye = true`, and `status = "pending"`. The system SHALL NOT auto-complete the match on import.

The system SHALL POST the parsed records to `POST /api/v1/events/:eventId/matches/bulk` and create one Match document per record.

The system SHALL NOT accept the legacy placeholder format `A{N}勝`. When such a value is encountered, the row SHALL be rejected with the error message: `「{N}勝」placeholder 格式不可包含 A 前綴，請將 "{value}" 改為「{N}勝」`.

#### Scenario: Successful ne-waza tournament import

- **WHEN** Admin uploads the file `寢技賽程匯入範本_115錦標賽.xlsx` containing 87 rows that include the `分級` column with the 7 Chinese tier labels above
- **THEN** the system creates 87 Match documents with the corresponding `MatchTier` codes mapped from each Chinese label
- **AND** the system displays a success toast with the count `已成功匯入 87 筆寢技賽程`

#### Scenario: Placement placeholder is parsed and source is recorded

- **WHEN** Admin imports a row where `紅方姓名 = "3勝"` and `紅方隊名 = ""` (empty)
- **THEN** the system creates a Match document with `redSource = { fromMatchNo: 3, resolved: false }`, `redPlayer.name = "3 勝者"`, `redPlayer.teamName = ""`
- **AND** the match `status` remains `pending`

#### Scenario: Bye match is created with isBye flag

- **WHEN** Admin imports a row where `紅方姓名 = "張三"`, `紅方隊名 = "A 隊"`, `藍方姓名 = ""`, `藍方隊名 = ""`
- **THEN** the system creates a Match document with `bluePlayer.name = ""`, `bluePlayer.teamName = ""`, `isBye = true`, `status = "pending"`
- **AND** the match SHALL NOT be auto-completed during import

#### Scenario: matchNo uses the 場次序 column value

- **WHEN** Admin imports a row where `場次序 = 16`
- **THEN** the system creates a Match document with `matchNo = 16` and `scheduledOrder = 16` regardless of the row's position in the spreadsheet

#### Scenario: Legacy A{N}勝 format is rejected

- **WHEN** Admin imports a row where `紅方姓名 = "A3勝"`
- **THEN** the system SHALL reject that row with the error message `「{N}勝」placeholder 格式不可包含 A 前綴，請將 "A3勝" 改為「3勝」`
- **AND** other valid rows in the same upload SHALL still be imported

#### Scenario: Unknown Chinese tier label is rejected

- **WHEN** Admin imports a row where `分級 = "成人組"` (not in the 7-label list)
- **THEN** the system SHALL reject that row with an error message listing the 7 valid labels

#### Scenario: Missing 場次序 is rejected

- **WHEN** Admin imports a row where the `場次序` cell is empty or non-numeric
- **THEN** the system SHALL reject that row with an error message `場次序為必填，且必須為正整數`

#### Scenario: Duplicate scheduledOrder within same matchType + category + weightClass + round

- **WHEN** Admin uploads two rows with identical `項目`, `組別`, `量級`, `回合`, and `場次序`
- **THEN** the system SHALL reject the duplicate row and report a conflict error

### Requirement: Match status transitions follow a strict lifecycle

Each Match document SHALL follow the state machine: `pending` → `in-progress` → `completed`.

The system SHALL NOT allow a match to transition from `completed` back to `in-progress` or `pending` via the referee interface.

For Match documents with `isBye === true` and `bluePlayer.name === ""`, the system SHALL additionally allow a direct transition `pending → completed` when the `result` field is provided with `winner = "red"`. The system SHALL NOT allow this `pending → completed` shortcut on non-bye matches.

Admin SHALL be able to override match status via `PATCH /api/v1/matches/:id` (admin-only).

#### Scenario: Referee starts a pending match

- **WHEN** match_referee selects a `pending` match and clicks start
- **THEN** the system transitions the match to `in-progress`
- **AND** emits `match:started` via Socket.IO to the event room

#### Scenario: Referee directly completes a bye match without timer

- **WHEN** match_referee opens a Match with `status = "pending"`, `isBye = true`, `bluePlayer.name = ""` and PATCHes `/api/v1/matches/:id` with `{ status: "completed", result: { winner: "red", method: "judge" } }`
- **THEN** the system SHALL accept the transition `pending → completed`
- **AND** the match.result SHALL be saved as provided
- **AND** propagation SHALL be triggered for any downstream matches whose `redSource.fromMatchNo` or `blueSource.fromMatchNo` equals this match's `matchNo`

#### Scenario: Referee cannot bypass timer on non-bye match

- **WHEN** match_referee tries to PATCH a Match with `isBye = false` directly from `status = "pending"` to `status = "completed"`
- **THEN** the system SHALL return HTTP 409 with the error `不允許從 pending 轉移至 completed`

#### Scenario: Referee attempts to enter a completed match

- **WHEN** match_referee selects a match with `status: 'completed'`
- **THEN** the system SHALL display a locked indicator on that match in the list
- **AND** SHALL NOT allow the referee to enter the scoring interface for that match

#### Scenario: Admin overrides a completed match

- **WHEN** Admin sends `PATCH /api/v1/matches/:id` with `{ status: 'pending' }` and valid admin JWT
- **THEN** the system updates the match status to `pending`

## ADDED Requirements

### Requirement: Match winner propagation to downstream sourced matches

When a Match document transitions to `status = "completed"` with `result.winner` set (one of `red` | `blue`), the system SHALL find all Match documents within the same `eventId` whose `redSource.fromMatchNo` or `blueSource.fromMatchNo` equals the completed match's `matchNo` AND whose corresponding `.resolved` flag is `false`.

For each downstream match found:

1. The system SHALL determine the winner's `name` and `teamName` from the completed match's `redPlayer` or `bluePlayer` (matching `result.winner`).
2. If the downstream match has `redSource.fromMatchNo === N && !redSource.resolved`, the system SHALL set `redPlayer.name = winnerName`, `redPlayer.teamName = winnerTeamName`, `redSource.resolved = true`.
3. If the downstream match has `blueSource.fromMatchNo === N && !blueSource.resolved`, the system SHALL set `bluePlayer.name = winnerName`, `bluePlayer.teamName = winnerTeamName`, `blueSource.resolved = true`.
4. The system SHALL broadcast one Socket.IO event `match:advancement-resolved` to the `eventId` room for each downstream match updated, with payload `{ matchId, side, playerName, teamName, fromMatchNo }`.

The system SHALL NOT re-propagate to downstream matches whose corresponding `.resolved` is already `true` (idempotent on re-completion).

The system SHALL trigger propagation within the same HTTP request handler that transitions the match to `completed`, so that downstream updates and broadcasts complete before the response is returned to the caller.

#### Scenario: Single downstream match is resolved on completion

- **GIVEN** event has Match #3 (red: 陳冠茗 / Jabari, blue: 黃晞恩 / 大隱) status `in-progress` and Match #16 status `pending` with `redSource = { fromMatchNo: 3, resolved: false }`, `redPlayer.name = "3 勝者"`
- **WHEN** referee PATCHes Match #3 with `{ status: "completed", result: { winner: "red", method: "judge" } }`
- **THEN** the system updates Match #16 to `redPlayer.name = "陳冠茗"`, `redPlayer.teamName = "Jabari"`, `redSource.resolved = true`
- **AND** broadcasts `match:advancement-resolved` with payload `{ matchId: "<#16 id>", side: "red", playerName: "陳冠茗", teamName: "Jabari", fromMatchNo: 3 }`

#### Scenario: Multiple downstream matches resolved by a single completion

- **GIVEN** Match #4 is sourced by both Match #76 (`redSource.fromMatchNo = 4`) and Match #80 (`blueSource.fromMatchNo = 4`)
- **WHEN** Match #4 transitions to `completed` with `winner = "blue"`
- **THEN** the system updates both Match #76 and Match #80 with Match #4's blue player info
- **AND** broadcasts `match:advancement-resolved` exactly twice (once per downstream match)

#### Scenario: Re-completing a match does not re-propagate

- **GIVEN** Match #3 already completed and Match #16 already has `redSource.resolved = true`, `redPlayer.name = "陳冠茗"`
- **WHEN** Admin PATCHes Match #3 again with a different `result.winner` value (correcting a recording mistake)
- **THEN** Match #16 SHALL NOT be re-updated (`redSource.resolved` already true means propagation is skipped)
- **AND** Admin SHALL manually correct downstream matches via `PATCH /api/v1/matches/:id` if needed
