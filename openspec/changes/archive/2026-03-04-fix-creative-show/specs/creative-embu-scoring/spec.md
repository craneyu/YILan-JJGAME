## MODIFIED Requirements

### Requirement: Final score calculated when all 5 judges have submitted

When all 5 judges have submitted their scores for a team, the system SHALL automatically calculate the final score. Calculation: for each score type (technical, artistic), remove the highest and lowest values, then sum the remaining 3. The grand total is the sum of the technical total and artistic total. Penalty deductions are subtracted from the grand total to produce the final score. The broadcast payload SHALL include `teamId` and a `penalties` array describing each penalty item so that both the sequence judge and audience displays can update in real-time without querying additional endpoints.

#### Scenario: Score calculation with all 5 judges submitted — broadcast payload

- **WHEN** the 5th judge submits their score
- **THEN** the system SHALL compute: technicalTotal = sum of middle 3 technical scores, artisticTotal = sum of middle 3 artistic scores, grandTotal = technicalTotal + artisticTotal, finalScore = grandTotal - totalPenaltyDeduction
- **AND** the system SHALL broadcast a `creative:score:calculated` Socket.IO event to the event room with the payload:
  ```
  {
    eventId: string,
    teamId: string,
    technicalTotal: number,
    artisticTotal: number,
    grandTotal: number,
    totalPenaltyDeduction: number,
    finalScore: number,
    penalties: Array<{ type: string, deduction: number, count: number }>
  }
  ```

#### Scenario: Maximum possible final score

- **WHEN** all 5 judges submit technical=9.5 and artistic=9.5 and no penalties exist
- **THEN** technicalTotal = 28.5 (middle 3 × 9.5), artisticTotal = 28.5, grandTotal = 57.0, finalScore = 57.0
- **AND** the broadcast payload SHALL include `teamId` and `penalties: []`
