# creative-embu-flow Delta Specification

## Purpose
Extend the team list information to include completion status and basic score summaries for sequence judges.

## ADDED Requirements

### Requirement: Team list includes completion status

The backend API for listing teams SHALL include an `isFinished` boolean for each team in creative competition. A team SHALL be determined as finished if a record exists in `CreativeScore` for that team in the current event.

#### Scenario: Team list shows finished teams

- **WHEN** a sequence judge requests the team list for a creative event
- **THEN** each team object in the response SHALL contain an `isFinished` property
- **AND** if `isFinished` is true, the object SHALL also include `finalScore` and `totalPenaltyDeduction`
