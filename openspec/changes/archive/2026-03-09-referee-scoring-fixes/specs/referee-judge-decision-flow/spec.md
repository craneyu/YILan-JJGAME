## MODIFIED Requirements

### Requirement: Referee judge decision two-phase flow

The referee interface SHALL separate the judge decision into two distinct phases: winner announcement and match finalization.

Phase 1 (Announcement): The referee taps "Red Wins" or "Blue Wins" to broadcast the winner to the audience display without writing the result to the database.

Phase 2 (Finalization): The referee taps either "End Match" or "Next Match" to finalize the result in the database and emit `match:ended`.

After Phase 1, the referee SHALL be able to cancel the announcement by tapping [取消宣告], which returns the UI to the Phase 1 button state without resetting the timer.

#### Scenario: Referee announces winner

- **WHEN** referee taps the "Red Wins" or "Blue Wins" button
- **THEN** the match timer SHALL pause
- **THEN** a `match:winner-preview` socket event SHALL be broadcast to the event room with `{ matchId, winner: 'red' | 'blue' }`
- **THEN** the "Red Wins" and "Blue Wins" buttons SHALL be hidden
- **THEN** "End Match", "Next Match", and "取消宣告" buttons SHALL appear

#### Scenario: Referee cancels announcement

- **WHEN** referee taps [取消宣告] after announcing a winner
- **THEN** `judgeWinner` SHALL be reset to null
- **THEN** the "Red Wins" and "Blue Wins" buttons SHALL reappear
- **THEN** the "End Match", "Next Match", and "取消宣告" buttons SHALL be hidden
- **THEN** the match timer SHALL remain paused (no automatic resume)

#### Scenario: Audience receives winner preview

- **WHEN** a `match:winner-preview` event is received on the audience display
- **THEN** the winner banner SHALL be displayed immediately
- **THEN** the losing player row SHALL dim (reduced opacity)

#### Scenario: Referee ends match

- **WHEN** referee taps the "End Match" button after announcing a winner
- **THEN** the system SHALL PATCH the match status to `completed` in the database
- **THEN** the system SHALL broadcast `match:ended` to the event room
- **THEN** a completion dialog SHALL be shown to the referee
- **THEN** the referee SHALL remain on the scoring view

#### Scenario: Referee moves to next match

- **WHEN** referee taps the "Next Match" button after announcing a winner
- **THEN** the system SHALL PATCH the match status to `completed` in the database
- **THEN** the system SHALL broadcast `match:ended` to the event room
- **THEN** the referee view SHALL return to the match list silently (no dialog)

### Requirement: Winner preview socket event

The system SHALL emit a `match:winner-preview` socket event when the referee announces a winner, before match finalization.

The event payload SHALL contain `{ matchId: string, winner: 'red' | 'blue' }`.

#### Scenario: Winner preview broadcast

- **WHEN** referee emits `match:emit-winner-preview` with a valid matchId and winner
- **THEN** the backend SHALL broadcast `match:winner-preview` to all clients in the eventId room
