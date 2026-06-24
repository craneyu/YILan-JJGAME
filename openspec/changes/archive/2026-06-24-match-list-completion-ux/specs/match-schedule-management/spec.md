## ADDED Requirements

### Requirement: Admin match management displays winner and decision method for completed matches

The Admin match management page (`/admin/matches/:matchType`) SHALL display the winner side and decision method for any match whose `status === 'completed'`, in addition to the existing green "完成" status badge.

The winner side SHALL be rendered as a coloured badge: red wins SHALL use `bg-red-500/20 text-red-300`, blue wins SHALL use `bg-blue-500/20 text-blue-300`. The decision method SHALL be rendered next to the winner badge using the following mapping:

| `m.result.method` value | Display text (Traditional Chinese) |
| --- | --- |
| `judge` | 裁判判決 |
| `submission` | 降伏勝 |
| `dq` | 取消資格 |

If `m.result` is missing on a completed match, the page SHALL still render the "完成" badge but SHALL omit the winner and method labels.

#### Scenario: Completed match shows red winner

- **WHEN** the page renders a row with `status: 'completed'` and `result: { winner: 'red', method: 'judge' }`
- **THEN** the row SHALL display the green "完成" badge AND a red-tinted "紅方勝" badge AND the text "裁判判決"

#### Scenario: Completed match shows blue winner with submission

- **WHEN** the page renders a row with `status: 'completed'` and `result: { winner: 'blue', method: 'submission' }`
- **THEN** the row SHALL display the green "完成" badge AND a blue-tinted "藍方勝" badge AND the text "降伏勝"

#### Scenario: Completed match without result data

- **WHEN** the page renders a row with `status: 'completed'` but `result` is undefined or null
- **THEN** the row SHALL display only the green "完成" badge with no winner/method labels and SHALL NOT throw a runtime error

### Requirement: Admin match management subscribes to match completion events for live updates

The Admin match management page SHALL subscribe to the `match:ended` Socket.IO event for the current event room. When an event arrives whose `matchId` matches an entry in the currently loaded match list, the page SHALL update that entry in place by setting `status = 'completed'` and `result = { winner, method }` from the event payload, then SHALL re-apply ordering and visual styling without requiring a manual page refresh.

#### Scenario: Live update on referee finalization

- **WHEN** a referee finalizes a match and the backend emits `match:ended` with payload `{ matchId: 'X', winner: 'red', method: 'judge' }`
- **AND** the admin has the match management page open with match X visible in the list
- **THEN** within one Socket.IO round-trip the row for match X SHALL show the "完成" badge, the red winner badge, and the "裁判判決" label
- **AND** the list ordering SHALL re-flow so match X sinks below remaining pending matches in its weight class group

#### Scenario: Event for unrelated match is ignored

- **WHEN** a `match:ended` event arrives whose `matchId` is not present in the currently loaded list (for example a different sport type page is open)
- **THEN** the page state SHALL remain unchanged and SHALL NOT throw a runtime error
