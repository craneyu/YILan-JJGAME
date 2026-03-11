## MODIFIED Requirements

### Requirement: Match result display

When a match result is determined, the losing player's row SHALL dim (reduced opacity) and a winner banner SHALL appear.

The winner banner SHALL display only the winner label text (e.g., "🔴 紅方勝" or "🔵 藍方勝").

The winner banner SHALL NOT display a trophy icon or a judgment method label (e.g., "裁判判決", "降伏").

#### Scenario: Red player wins

- **WHEN** a match result event is received with `winner: 'red'`
- **THEN** the blue player row SHALL have reduced opacity
- **THEN** a winner indicator SHALL be visible showing "🔴 紅方勝"
- **THEN** no trophy icon SHALL be shown in the winner banner
- **THEN** no judgment method text SHALL be shown in the winner banner
