## ADDED Requirements

### Requirement: Completed matches are displayed after pending and in-progress matches

The fighting-referee and ne-waza-referee components SHALL order matches within each weight class group by `status` first (pending and in-progress matches before completed matches), then by `scheduledOrder` ascending within each status partition. This ordering SHALL be applied client-side via the component's computed/sort logic and SHALL NOT require any backend ordering change.

The contact-referee component, if it renders the same match list pattern, SHALL apply the same ordering rule.

#### Scenario: Pending matches float above completed matches

- **WHEN** a weight class group contains matches with statuses `[completed, pending, completed, pending]` originally interleaved by `scheduledOrder`
- **THEN** the rendered order SHALL be the two pending matches first (sorted by `scheduledOrder`), then the two completed matches (sorted by `scheduledOrder`)

##### Example: mixed status ordering

- **GIVEN** matches in one weight class group:
  | matchId | scheduledOrder | status |
  |---|---|---|
  | M1 | 1 | completed |
  | M2 | 2 | pending |
  | M3 | 3 | completed |
  | M4 | 4 | in-progress |
- **WHEN** the list is rendered
- **THEN** the display order SHALL be: M4 (in-progress, order 4), M2 (pending, order 2), M1 (completed, order 1), M3 (completed, order 3)

#### Scenario: A referee finishes a match and the list re-orders

- **WHEN** the referee finalizes the currently in-progress match and the component returns to the list view
- **THEN** the just-completed match SHALL appear below all remaining pending matches within its weight class group
- **AND** the next pending match SHALL appear at the top of the group's section

### Requirement: Completed match rows are visually distinguished from pending rows

The fighting-referee, ne-waza-referee, and contact-referee match list components SHALL apply a distinct background tint to completed match rows so they are visually separable from pending and in-progress rows.

Completed rows SHALL use a tinted background utility (for example `bg-emerald-500/10`) on top of the base `.glass-card` style, and SHALL reduce the primary text saturation (for example `text-white/60`). Pending rows SHALL retain the default `.glass-card` appearance; in-progress rows SHALL retain the existing yellow status badge.

#### Scenario: Completed row uses emerald tint

- **WHEN** the match list renders a row whose `status === 'completed'`
- **THEN** that row SHALL include the tinted background class so it appears visually distinct from a default pending row in the same weight class group

#### Scenario: Pending row appearance unchanged

- **WHEN** the match list renders a row whose `status === 'pending'`
- **THEN** the row SHALL render with the default `.glass-card` style without the completed tint
