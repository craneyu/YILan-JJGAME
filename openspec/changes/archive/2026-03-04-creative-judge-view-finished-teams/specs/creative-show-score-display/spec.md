# creative-show-score-display Delta Specification

## Purpose
Introduce a read-only score view for finished teams in the sequence judge interface.

## ADDED Requirements

### Requirement: Read-only score view for finished teams

In the creative sequence judge interface, when an "already finished" team is selected, the control area SHALL switch to a read-only results panel. This panel SHALL display the team's technical total, artistic total, final score, and any penalties recorded.

#### Scenario: Selection of finished team locks controls

- **WHEN** a sequence judge selects a team with `isFinished: true`
- **THEN** the Start Timer, Pause, and Open Scoring buttons SHALL be hidden
- **AND** a results summary panel SHALL be displayed, showing the calculated final score and a list of penalties
