## ADDED Requirements

### Requirement: Match list shows placeholder for unresolved sourced players

For Match documents with `redSource` or `blueSource` set and `.resolved === false`, the match management list and the `ne-waza-referee` list SHALL render the corresponding side's player name as a placeholder of the form `"N 勝者"` (where N is `source.fromMatchNo`).

The placeholder text SHALL be visually distinguished using muted italic styling (Tailwind: `text-white/40 italic`) so the operator can distinguish unresolved placeholders from real player names.

When `.resolved === true`, the system SHALL render the actual `redPlayer.name` / `redPlayer.teamName` (or blue counterpart) without placeholder styling.

The placeholder rendering SHALL react to incoming `match:advancement-resolved` Socket.IO events by re-rendering the affected list row without requiring a manual reload.

#### Scenario: Unresolved sourced match shows placeholder

- **GIVEN** Match #16 has `redSource = { fromMatchNo: 3, resolved: false }`, `redPlayer.name = "3 勝者"`, `redPlayer.teamName = ""`, `bluePlayer.name = "許程睿"`, `bluePlayer.teamName = "大隱國小"`
- **WHEN** admin or referee views the match list
- **THEN** Match #16's red column SHALL display `"3 勝者"` in muted italic text
- **AND** Match #16's blue column SHALL display `"許程睿"` and `"大隱國小"` in normal styling

#### Scenario: Resolved placeholder switches to actual name

- **GIVEN** Match #16 currently shows red column as `"3 勝者"` placeholder
- **WHEN** the client receives a `match:advancement-resolved` event with `{ matchId: <#16 id>, side: "red", playerName: "陳冠茗", teamName: "Jabari", fromMatchNo: 3 }`
- **THEN** Match #16's red column SHALL re-render to show `"陳冠茗"` / `"Jabari"` in normal styling within the same view (no manual reload)

#### Scenario: Match without source renders normally

- **GIVEN** Match #5 has `redSource = undefined`, `blueSource = undefined`
- **WHEN** the match list renders Match #5
- **THEN** both player columns SHALL render normally with no placeholder styling
