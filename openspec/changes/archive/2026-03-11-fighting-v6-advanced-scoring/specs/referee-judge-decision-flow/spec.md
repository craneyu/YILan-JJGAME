# referee-judge-decision-flow Delta Specification

## ADDED Requirements

### Requirement: FULL IPPON triggers pending state requiring referee confirmation

When a FULL IPPON condition is detected (all three PART IPPON counts >= 1), the system SHALL set Match status to `full-ippon-pending` and pause the timer and emit `match:full-ippon`. The referee interface SHALL highlight the [Red Wins] / [Blue Wins] buttons and SHALL NOT auto-finalize the match.

#### Scenario: FULL IPPON pending displayed on referee screen

- **WHEN** the referee interface receives `match:full-ippon`
- **THEN** the timer SHALL pause AND a FULL IPPON alert banner SHALL appear AND the [Red Wins] and [Blue Wins] buttons SHALL remain visible and be highlighted for confirmation

#### Scenario: Referee confirms winner after FULL IPPON

- **WHEN** Match is in `full-ippon-pending` status and referee presses [Red Wins]
- **THEN** the match SHALL be finalized with `winner: 'red'` and `method: 'full-ippon'`

### Requirement: SHIDO DQ triggers pending state requiring referee confirmation

When SHIDO DQ alert is received (`match:shido-dq`), the referee interface SHALL display a DQ alert banner and pause the timer. The referee SHALL still press [Red Wins] / [Blue Wins] to complete the judgment.

#### Scenario: SHIDO DQ pending displayed on referee screen

- **WHEN** the referee interface receives `match:shido-dq` with `{ suggestedDisqualified, suggestedWinner }`
- **THEN** the timer SHALL pause AND a DQ alert banner SHALL show the disqualified player's SHIDO count AND [Red Wins] and [Blue Wins] buttons SHALL remain visible for final confirmation

#### Scenario: Referee confirms winner after SHIDO DQ alert

- **WHEN** Match is in `shido-dq-pending` status and referee presses [Blue Wins]
- **THEN** the match SHALL be finalized with `winner: 'blue'` and `method: 'shido-dq'`
