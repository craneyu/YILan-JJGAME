## ADDED Requirements

### Requirement: Audience score sections have color-coded borders and labels

The red player's row SHALL have a border using a light pink color (e.g., `border-red-400/40`) and a drop shadow (e.g., `shadow-lg shadow-red-900/20`).

The blue player's row SHALL have a border using a light blue color (e.g., `border-blue-400/40`) and a drop shadow (e.g., `shadow-lg shadow-blue-900/20`).

Each player's large score block SHALL have a "得分" label displayed directly above it.

#### Scenario: Score section borders visible

- **WHEN** the audience display shows an active match
- **THEN** the red player row SHALL display a pink-tinted border and shadow
- **THEN** the blue player row SHALL display a blue-tinted border and shadow

#### Scenario: Score label displayed

- **WHEN** the audience display shows an active match
- **THEN** a "得分" label SHALL appear above the large score block for both red and blue players

### Requirement: Audience warning display uses yellow card grid

The warning count for each player SHALL be displayed as a 2×2 grid of four square boxes.

When a player has N warnings, the first N boxes SHALL be filled yellow (`bg-yellow-400`). The remaining boxes SHALL be gray (`bg-white/20`).

The warning count SHALL NOT exceed 4. All four boxes filled indicates the player has reached the warning limit.

#### Scenario: Player has 2 warnings

- **WHEN** a player has 2 warnings
- **THEN** 2 boxes SHALL be yellow and 2 boxes SHALL be gray in the 2×2 grid

#### Scenario: Player has 0 warnings

- **WHEN** a player has 0 warnings
- **THEN** all 4 boxes SHALL be gray

#### Scenario: Player has 4 warnings (maximum)

- **WHEN** a player has 4 warnings
- **THEN** all 4 boxes SHALL be yellow

### Requirement: Warning and advantage positions are swapped in audience display

The layout order for each player's stat section SHALL be: **警告 (warning) first, then 優勢 (advantage)** when displayed from left to right.

This is the reverse of the previous layout which showed advantage before warning.

#### Scenario: Layout order confirmed

- **WHEN** the audience display shows an active match
- **THEN** the warning grid SHALL appear to the LEFT of the advantage count for each player
