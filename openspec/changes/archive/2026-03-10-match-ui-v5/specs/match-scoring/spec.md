## REMOVED Requirements

### Requirement: Undo last scoring action

**Reason**: The undo last action ("取消上一筆") feature is no longer needed per SPEC-v5. Removing it simplifies the referee interface and prevents accidental score correction during a match.

**Migration**: Referees SHALL use the score adjustment buttons (+/-) to manually correct scores instead of undoing.

#### Scenario: Undo button is absent from referee interface

- **WHEN** the referee interface renders an active match
- **THEN** no "取消" (undo last action) button SHALL be present in the red or blue player sections

## ADDED Requirements

### Requirement: Warning count is capped at 4

The system SHALL enforce a maximum of 4 warnings per player per match.

When a player's warning count reaches 4, the warning increment button for that side SHALL be disabled.

The warning decrement button SHALL remain enabled as long as the warning count is greater than 0.

#### Scenario: Warning cap enforced

- **WHEN** a player has 4 warnings and the referee attempts to add another warning
- **THEN** the warning increment button SHALL be disabled and unresponsive
- **THEN** the warning count SHALL remain at 4

#### Scenario: Warning decrement still works at cap

- **WHEN** a player has 4 warnings and the referee taps the warning decrement button
- **THEN** the warning count SHALL decrease to 3
- **THEN** the warning increment button SHALL become enabled again

### Requirement: Referee scoring panel uses color-coded backgrounds

The red player's scoring section SHALL have a light pink background (e.g., `bg-red-950/30`) to visually distinguish it from the blue player's section.

The blue player's scoring section SHALL have a light blue background (e.g., `bg-blue-950/30`).

#### Scenario: Red and blue sections visually distinct

- **WHEN** the referee interface displays an active match
- **THEN** the red player section SHALL have a visually distinct pinkish background
- **THEN** the blue player section SHALL have a visually distinct bluish background
