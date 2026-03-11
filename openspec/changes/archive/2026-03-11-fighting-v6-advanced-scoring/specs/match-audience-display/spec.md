# match-audience-display Delta Specification

## ADDED Requirements

### Requirement: FULL IPPON overlay on audience display

The audience display SHALL render a full-screen overlay when a `match:full-ippon` Socket event is received.

#### Scenario: FULL IPPON overlay appears

- **WHEN** the audience component receives `match:full-ippon` with `{ matchId, winner, winnerName }`
- **THEN** a fixed full-screen overlay SHALL appear with text "FULL IPPON" in large bold yellow text and the winner's name below

#### Scenario: FULL IPPON overlay dismissed on next match

- **WHEN** a `match:started` or `match:reset` event is received
- **THEN** the FULL IPPON overlay SHALL be dismissed automatically

### Requirement: CHUI badge on audience player row

The audience display SHALL show a CHUI badge for each player when their CHUI count is ≥ 1.

#### Scenario: CHUI badge visible at count 1

- **WHEN** a player's CHUI count is 1 or 2
- **THEN** the audience display SHALL show a CHUI badge with the numeric count next to that player's name

#### Scenario: No CHUI badge at zero

- **WHEN** a player's CHUI count is 0
- **THEN** no CHUI badge SHALL appear for that player

### Requirement: PART scores displayed on audience player row

The audience display SHALL show each player's PART 1, PART 2, and PART 3 scores in order.

#### Scenario: PART score row rendered

- **WHEN** a match is in progress with PART scores recorded
- **THEN** the audience display SHALL render a PART score row per player showing PART 1, PART 2, PART 3 values in left-to-right order
