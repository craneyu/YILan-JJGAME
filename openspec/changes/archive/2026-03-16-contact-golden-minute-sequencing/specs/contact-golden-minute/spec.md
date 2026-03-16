## MODIFIED Requirements

### Requirement: Referee can trigger golden minute up to twice

The referee interface SHALL provide a [黃金分鐘] button that is enabled only when ALL of the following conditions are met:
1. `goldenMinuteCount < 2`
2. The match timer has naturally counted down to zero (i.e., the `timerNaturallyEnded` flag is `true`)

The button SHALL NOT be enabled when the timer was manually adjusted to zero or when the timer is still running.

When triggered, the system SHALL:
1. Increment `goldenMinuteCount` by 1
2. Reset the match timer to 60 seconds
3. Pause the timer (do NOT start countdown automatically)
4. Reset `timerNaturallyEnded` to `false`
5. Broadcast `match:contact-golden-minute` with payload `{ matchId, goldenMinuteCount: number }`

#### Scenario: Golden minute button disabled while main timer is running

- **WHEN** the main match timer is actively counting down
- **THEN** the [黃金分鐘] button SHALL be disabled regardless of `goldenMinuteCount`

#### Scenario: Golden minute button disabled after manual timer adjustment to zero

- **WHEN** the referee uses [-1s] or [-10s] to reduce the timer to 0 seconds
- **THEN** the [黃金分鐘] button SHALL remain disabled (timerNaturallyEnded is false)

#### Scenario: First golden minute available after main timer naturally expires

- **WHEN** the 3-minute main timer counts down to 0 via the interval (natural expiry)
- **THEN** `timerNaturallyEnded` SHALL become `true`
- **THEN** the [黃金分鐘] button SHALL become enabled (if `goldenMinuteCount` is 0)

#### Scenario: Referee triggers first golden minute

- **WHEN** referee taps [黃金分鐘] and `goldenMinuteCount` is 0 and `timerNaturallyEnded` is `true`
- **THEN** `goldenMinuteCount` SHALL become 1
- **THEN** the match timer SHALL reset to 60 seconds and enter paused state
- **THEN** `timerNaturallyEnded` SHALL become `false`
- **THEN** `match:contact-golden-minute` SHALL be broadcast with `goldenMinuteCount: 1`

#### Scenario: Second golden minute not available until first naturally expires

- **WHEN** `goldenMinuteCount` is 1 and the 60-second golden minute timer is still running or was paused before reaching 0
- **THEN** the [黃金分鐘] button SHALL be disabled

#### Scenario: Second golden minute available after first golden minute naturally expires

- **WHEN** the 60-second first golden minute timer counts down to 0 via the interval (natural expiry)
- **THEN** `timerNaturallyEnded` SHALL become `true`
- **THEN** the [黃金分鐘] button SHALL become enabled (if `goldenMinuteCount` is 1)

#### Scenario: Referee triggers second golden minute

- **WHEN** referee taps [黃金分鐘] and `goldenMinuteCount` is 1 and `timerNaturallyEnded` is `true`
- **THEN** `goldenMinuteCount` SHALL become 2
- **THEN** the match timer SHALL reset to 60 seconds and enter paused state
- **THEN** `timerNaturallyEnded` SHALL become `false`
- **THEN** `match:contact-golden-minute` SHALL be broadcast with `goldenMinuteCount: 2`

#### Scenario: Golden minute button is disabled after two uses

- **WHEN** `goldenMinuteCount` is 2
- **THEN** the [黃金分鐘] button SHALL be rendered in disabled state and SHALL NOT respond to taps

---

## ADDED Requirements

### Requirement: Referee can fine-adjust the match timer while paused

The referee interface SHALL display four timer adjustment buttons when the timer is paused and no winner has been declared: [-10s], [-1s], [+1s], [+10s].

Each button SHALL:
1. Modify `timerRemaining` by the corresponding delta (clamped to minimum 0)
2. Reset `timerNaturallyEnded` to `false`

The adjustment buttons SHALL be disabled (not rendered or not clickable) when the timer is running or when a winner has been declared.

#### Scenario: Referee adjusts timer down by 1 second

- **WHEN** the timer is paused and the referee taps [-1s]
- **THEN** `timerRemaining` SHALL decrease by 1 (minimum 0)
- **THEN** `timerNaturallyEnded` SHALL become `false`

#### Scenario: Referee adjusts timer up by 10 seconds

- **WHEN** the timer is paused and the referee taps [+10s]
- **THEN** `timerRemaining` SHALL increase by 10
- **THEN** `timerNaturallyEnded` SHALL become `false`

#### Scenario: Adjustment buttons hidden while timer is running

- **WHEN** the match timer is actively counting down
- **THEN** the adjustment buttons SHALL NOT be interactive
