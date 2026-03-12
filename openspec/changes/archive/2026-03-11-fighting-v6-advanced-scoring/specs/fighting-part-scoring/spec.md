# fighting-part-scoring Specification

## Purpose

Define PART 1 / PART 2 / PART 3 sectional scoring and IPPON counting logic for the match referee interface, including ALL PARTS direct total adjustment.

## ADDED Requirements

### Requirement: PART sectional score buttons

The referee interface SHALL display three score button groups — PART 1, PART 2, PART 3 — each containing four buttons: +2, +3, -2, -3. An ALL PARTS section SHALL contain +1 and -1 buttons that adjust the player's total score directly without associating with any PART.

#### Scenario: Referee clicks +2 in PART 1

- **WHEN** referee clicks +2 in the PART 1 group for a player
- **THEN** that player's PART 1 score SHALL increase by 2 AND the player's total score SHALL increase by 2 AND PART 1 IPPON count SHALL increase by 1

#### Scenario: Referee clicks +3 in PART 2

- **WHEN** referee clicks +3 in the PART 2 group for a player
- **THEN** that player's PART 2 score SHALL increase by 3 AND the player's total score SHALL increase by 3 AND PART 2 IPPON count SHALL increase by 1

#### Scenario: Referee clicks -2 in PART 3

- **WHEN** referee clicks -2 in the PART 3 group for a player
- **THEN** that player's PART 3 score SHALL decrease by 2 AND the player's total score SHALL decrease by 2 AND PART 3 IPPON count SHALL decrease by 1 (minimum 0)

#### Scenario: ALL PARTS +1 adjustment

- **WHEN** referee clicks +1 in the ALL PARTS section for a player
- **THEN** that player's total score SHALL increase by 1 AND no PART score or IPPON count SHALL change

### Requirement: PART score display above player card

The referee interface SHALL display each player's PART scores in the order PART 1, PART 2, PART 3 above the scoring buttons. Each PART SHALL show its accumulated score value.

#### Scenario: PART scores rendered in order

- **WHEN** a match is in progress
- **THEN** the referee interface SHALL render the player's PART scores as three labeled values in left-to-right order: PART 1, PART 2, PART 3

### Requirement: PART score and IPPON snapshot stored in log

Every scoring action on a PART button SHALL be persisted to `MatchScoreLog` with fields: `partIndex` (1, 2, or 3; null for ALL PARTS), `delta` (the score change), and `ipponsSnapshot` ({ p1, p2, p3 } counts after this action).

#### Scenario: Log entry created on PART scoring

- **WHEN** referee submits a PART score button action via the API
- **THEN** a `MatchScoreLog` document SHALL be created with `partIndex`, `delta`, and `ipponsSnapshot` fields populated correctly

#### Scenario: Log entry for ALL PARTS action

- **WHEN** referee submits an ALL PARTS +1 or -1 action
- **THEN** a `MatchScoreLog` document SHALL be created with `partIndex: null` and `ipponsSnapshot` unchanged from the previous log entry
