## ADDED Requirements

### Requirement: Sequence judge marks violation penalties

The sequence judge SHALL be able to mark one or more violation penalties for a team's performance. Each penalty type is independent and MAY be applied in combination.

Penalty types and deductions:
- `overtime`: Performance exceeded 2 minutes → deduct 1.0 point
- `undertime`: Performance was under 1 minute 30 seconds → deduct 1.0 point
- `props`: More than 2 props used → deduct 1.0 point
- `attacks`: Failed to meet minimum attack count → deduct 0.5 points

#### Scenario: Single penalty applied

- **WHEN** the sequence judge marks the `overtime` penalty for a team
- **THEN** the system SHALL persist a `/creative_penalties` record with `penaltyType: 'overtime'` and `deduction: 1.0`, and broadcast a `penalty:updated` Socket.IO event

#### Scenario: Multiple penalties applied simultaneously

- **WHEN** the sequence judge marks both `overtime` and `props` penalties
- **THEN** the system SHALL store two separate records and the total deduction SHALL be 2.0 points

#### Scenario: Penalty removed

- **WHEN** the sequence judge deselects a previously marked penalty
- **THEN** the system SHALL delete the corresponding record and broadcast an updated `penalty:updated` event with the revised penalty list

### Requirement: Penalties affect final score calculation

When computing a team's final score, the system SHALL sum all active penalty deductions for that team and subtract from the grand total. The final score SHALL NOT be negative; if penalties exceed the grand total, the final score SHALL be 0.

#### Scenario: Final score with penalties

- **WHEN** a team's grandTotal is 42.5 and they have `overtime` (-1.0) and `attacks` (-0.5) penalties
- **THEN** finalScore = 42.5 - 1.0 - 0.5 = 41.0

#### Scenario: Penalties cannot produce negative final score

- **WHEN** a team's grandTotal is 1.0 and total penalties are 2.0
- **THEN** finalScore SHALL be 0.0, not -1.0

### Requirement: Penalties visible on audience display

The audience display SHALL show any applied penalties for the current team with penalty type labels and total deduction amount.

#### Scenario: Penalty displayed to audience

- **WHEN** a `penalty:updated` event is received with active penalties
- **THEN** the audience display SHALL render each penalty type as a warning label and show the total deduction amount
