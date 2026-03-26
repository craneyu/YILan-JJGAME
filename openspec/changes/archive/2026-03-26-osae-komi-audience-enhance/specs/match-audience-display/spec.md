## ADDED Requirements

### Requirement: OSAE KOMI display positioned between player name and score cards

The OSAE KOMI display SHALL be rendered as a dedicated flex element between the player name section and the score card section (WAZA-ARI / SHIDO), not inline with the player name.

When OSAE KOMI is not active, this middle section SHALL occupy zero width and SHALL NOT affect the layout.

When OSAE KOMI is active, the section SHALL expand to display the countdown timer, label, and progress bar as a vertically stacked column centered within the available space.

#### Scenario: OSAE KOMI appears between name and scores

- **WHEN** `osae-komi:started` is received for the red player
- **THEN** the OSAE KOMI display SHALL appear as a separate flex item between the red player name area and the WAZA-ARI/SHIDO cards
- **AND** the player name area and score cards SHALL remain visible on either side

#### Scenario: OSAE KOMI hidden when inactive

- **WHEN** OSAE KOMI is not active for a player
- **THEN** no OSAE KOMI element SHALL be rendered between the name and score cards
- **AND** the layout SHALL collapse as if the element does not exist

### Requirement: OSAE KOMI countdown timer is displayed at enlarged size

The OSAE KOMI countdown timer text SHALL use font size classes `text-6xl md:text-8xl` with `font-black` weight.

The "OSAE KOMI" label text SHALL use font size classes `text-xl md:text-2xl` with `font-black` weight and `tracking-widest` letter spacing.

The container SHALL use `bg-yellow-500/15 border border-yellow-400/50 rounded-xl` styling with `animate-pulse` animation and yellow text color (`text-yellow-300`).

#### Scenario: Timer text is visibly large

- **WHEN** OSAE KOMI is active for a player
- **THEN** the countdown digits SHALL render at `text-6xl` on mobile and `text-8xl` on desktop (md breakpoint)
- **AND** the "OSAE KOMI" label SHALL render at `text-xl` on mobile and `text-2xl` on desktop

### Requirement: OSAE KOMI progress bar with 15 segments

The OSAE KOMI display SHALL include a horizontal progress bar rendered below the countdown timer and label.

The progress bar SHALL consist of exactly 15 rectangular segments displayed in a single horizontal row.

Each segment SHALL represent one second of the 15-second countdown. When the countdown starts at 15 seconds, all 15 segments SHALL be filled (bright yellow, `bg-yellow-400`). Each second, one segment SHALL transition to empty state (`bg-white/10`), from right to left.

The progress bar container SHALL have a minimum width of `min-w-[200px] md:min-w-[280px]` to ensure visibility from a distance.

#### Scenario: Progress bar fully filled at countdown start

- **WHEN** `osae-komi:started` is received with `durationSec: 15`
- **THEN** all 15 segments SHALL be filled with bright yellow color

#### Scenario: Progress bar decreases each second

- **WHEN** the countdown reaches 10 seconds remaining
- **THEN** 10 segments SHALL be filled yellow and 5 segments SHALL be empty (dimmed)

#### Scenario: Progress bar fully empty at countdown end

- **WHEN** the countdown reaches 0 seconds
- **THEN** all 15 segments SHALL be empty (dimmed)

#### Scenario: Progress bar adapts to non-default duration

- **WHEN** `osae-komi:started` is received with a `durationSec` value other than 15
- **THEN** the progress bar SHALL still display 15 fixed segments
- **AND** the number of filled segments SHALL be calculated as `Math.min(15, remainingSeconds)`

### Requirement: OSAE KOMI bell sound plays at maximum volume

When the OSAE KOMI countdown reaches 0, the `bell-short.mp3` audio SHALL be played with `volume` property set to `1.0` (maximum).

#### Scenario: Bell sound at max volume on countdown end

- **WHEN** the OSAE KOMI countdown transitions from 1 to 0
- **THEN** a new `Audio('assets/sounds/bell-short.mp3')` instance SHALL be created with `volume = 1.0`
- **AND** the `play()` method SHALL be called on that instance
