## ADDED Requirements

### Requirement: Sequence judge timer view displays real-time calculated score

After all 5 scoring judges have submitted their scores, the sequence judge's timer view SHALL display the calculated results at the bottom of the screen. The display SHALL update automatically upon receiving the `creative:score:calculated` Socket.IO broadcast, without any manual action by the sequence judge.

#### Scenario: Score results appear after all judges submit

- **WHEN** the sequence judge's page receives a `creative:score:calculated` event matching the current `teamId`
- **THEN** the timer view SHALL immediately show a results panel below the timer containing: technicalTotal, artisticTotal, penalty deduction total, and finalScore

#### Scenario: Penalty details listed when deductions exist

- **WHEN** the received `creative:score:calculated` payload contains a non-empty `penalties` array
- **THEN** each penalty item SHALL be listed with its type label and deduction amount

#### Scenario: No penalty section shown when no deductions

- **WHEN** the received `creative:score:calculated` payload contains `penalties: []`
- **THEN** the results panel SHALL show zero deductions without listing individual penalty rows

#### Scenario: Score display cleared when new team is selected

- **WHEN** the sequence judge selects a different team from the team list
- **THEN** any previously displayed score results SHALL be cleared from the timer view

### Requirement: Audience page displays real-time score and team information

The audience display page SHALL update the current team's name and participant names in real-time when the sequence judge opens scoring for a new team. It SHALL also update score and penalty information in real-time when the `creative:score:calculated` event is received.

#### Scenario: Team name and participants update on scoring opened

- **WHEN** the audience page receives a `creative:scoring-opened` event
- **THEN** the page SHALL immediately update the displayed team name and participant names to match the event payload, without requiring a page reload

#### Scenario: Score and penalty display updates after calculation

- **WHEN** the audience page receives a `creative:score:calculated` event
- **THEN** the page SHALL immediately update to show: technicalTotal, artisticTotal, totalPenaltyDeduction, finalScore, and the list of penalty items with their deduction amounts
