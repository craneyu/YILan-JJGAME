# creative-show-score-display Delta Specification

## Purpose
Update the audience page score display to integrate technical and artistic scores into a single line and remove the redundant grand total display.

## ADDED Requirements

### Requirement: Audience page displays integrated single-line score

The audience display page SHALL present the technical score and artistic score side-by-side on a single row to optimize vertical space. The "Grand Total" (sum of technical and artistic before penalties) SHALL be removed from the display to focus on final results.

#### Scenario: Scores integrated into one line

- **WHEN** the audience page receives a `creative:score:calculated` event
- **THEN** the UI SHALL display technicalTotal and artisticTotal horizontally aligned in the same section
- **AND** the "Grand Total" label and value SHALL NOT be visible

#### Scenario: Final score remains prominent

- **WHEN** the score calculation results are displayed
- **THEN** the `finalScore` SHALL be displayed with the highest visual priority (largest font/prominent styling) to remain the focal point for the audience
