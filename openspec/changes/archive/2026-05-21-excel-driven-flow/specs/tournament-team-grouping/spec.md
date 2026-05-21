## ADDED Requirements

### Requirement: Tournament event execution order follows Excel row sequence

Under tournament events, the (tier, category) group execution order SHALL be determined solely by the row order of the imported teams roster. The system SHALL NOT use `Event.categoryOrderDuo`, `Event.categoryOrderShow`, or any other configured category-order setting for tournament event flow control.

The group construction rule SHALL be:

1. Sort all teams (excluding `competitionType: 'Show'`) by `Team.order` ascending.
2. Walk through the sorted list. For each team, compute its group key as `(team.tier, team.category)`.
3. If the group key has not been seen, create a new group at the current end of the execution sequence with this team as its first member.
4. If the group key has been seen, append this team to the existing group (the group's position in the execution sequence remains unchanged — it was set when first seen).

This rule SHALL produce a deterministic execution sequence where the (tier, category) groups appear in the order they first appear in the Excel rows, and within each group the teams appear in `Team.order` ascending.

For sports-day events, this rule SHALL NOT apply; sports-day SHALL continue using `resolveCategoryOrder()` + `sortTeams()` for its existing category-major rotation.

#### Scenario: Tournament with male EL first, then mixed EL, then female EM produces 3 groups in that order

- **GIVEN** a tournament event with 5 teams imported in order: row1=male/EL, row2=male/EL, row3=mixed/EL, row4=mixed/EL, row5=female/EM
- **WHEN** the system builds the group execution sequence
- **THEN** the sequence SHALL be `[ (EL,male), (EL,mixed), (EM,female) ]` in that order; each group's `teams` list SHALL be in `Team.order` ascending

#### Scenario: Non-contiguous Excel rows for the same (tier, category) are merged

- **GIVEN** a tournament event with rows: row1=male/EL, row2=mixed/EL, row3=male/EL (same tier+category as row1 but separated by row2)
- **WHEN** the system builds the group execution sequence
- **THEN** the sequence SHALL contain 2 groups: `[ (EL,male), (EL,mixed) ]`; the (EL,male) group SHALL contain rows 1 and 3 together; the group's position in the sequence is at index 0 (first appearance of male/EL)

#### Scenario: Empty (tier, category) groups do not appear

- **GIVEN** a tournament event whose imported teams cover male/EL, mixed/EL, female/EM, mixed/EM (but no female/EL, no male/EM)
- **WHEN** the system builds the group execution sequence
- **THEN** the sequence SHALL contain exactly 4 groups: `[ (EL,male), (EL,mixed), (EM,female), (EM,mixed) ]`; female/EL and male/EM SHALL NOT appear at all
