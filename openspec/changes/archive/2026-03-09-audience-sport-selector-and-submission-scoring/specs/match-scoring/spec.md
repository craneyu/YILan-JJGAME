## ADDED Requirements

### Requirement: Submission scoring value

When a referee registers a submission (降伏), the winning side SHALL receive 99 points to represent a technical victory.

The submission SHALL NOT automatically end the match. The referee MUST manually confirm the winner by pressing the red-wins or blue-wins button before the match is ended.

#### Scenario: Submission registered

- **WHEN** the referee presses the submission button for a side
- **THEN** the system SHALL record 99 points for that side
- **THEN** the system SHALL pause the match timer
- **THEN** the system SHALL display a toast notification indicating submission is pending confirmation
- **THEN** the match status SHALL remain in-progress

#### Scenario: Winner confirmed after submission

- **WHEN** a submission is pending and the referee presses the red-wins or blue-wins confirmation button
- **THEN** the system SHALL end the match with `method: "submission"`
- **THEN** the system SHALL broadcast the match-ended event to all audience clients

#### Scenario: Submission pending state persists until confirmed

- **WHEN** a submission has been registered but not yet confirmed
- **THEN** the referee interface SHALL clearly indicate that a submission is pending
- **THEN** all scoring controls SHALL remain accessible for corrections if needed
