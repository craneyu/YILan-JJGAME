# match-scoring Delta Specification

## ADDED Requirements

### Requirement: MatchScoreLog stores PART index and IPPON snapshot

The `MatchScoreLog` model SHALL include:
- `partIndex: 1 | 2 | 3 | null` — which PART the action belongs to; null for ALL PARTS
- `ipponsSnapshot: { p1: number, p2: number, p3: number }` — IPPON counts per PART after this action
- `actionType: string` — type of action: `'part-score'`, `'all-parts-score'`, `'foul'`, `'timer-adjust'`

#### Scenario: PART score log created with snapshot

- **WHEN** a PART scoring action is persisted
- **THEN** the `MatchScoreLog` document SHALL contain `partIndex`, `delta`, and `ipponsSnapshot` with the post-action IPPON counts

### Requirement: Match model stores PART scores, WAZA-ARI counts, and SHIDO counts

The `Match` model SHALL include the following new fields:
- `redPart1Score`, `redPart2Score`, `redPart3Score`: Number (default: 0)
- `bluePart1Score`, `bluePart2Score`, `bluePart3Score`: Number (default: 0)
- `redIppons`: `{ p1: number, p2: number, p3: number }` (default: {p1:0, p2:0, p3:0})
- `blueIppons`: `{ p1: number, p2: number, p3: number }` (default: {p1:0, p2:0, p3:0})
- `redWazaAri`: Number (default: 0) — total WAZA-ARI count for red player
- `blueWazaAri`: Number (default: 0) — total WAZA-ARI count for blue player
- `redShido`: Number (default: 0) — unified SHIDO counter (CHUI adds 3)
- `blueShido`: Number (default: 0) — unified SHIDO counter (CHUI adds 3)
- `matchDuration`: Number (seconds, default: 180)
- `status`: extended with `'full-ippon-pending'` and `'shido-dq-pending'` states

#### Scenario: Match document initialized with default fields

- **WHEN** a new Match document is created
- **THEN** all PART score fields SHALL default to 0 AND all IPPON snapshot fields SHALL default to 0 AND WAZA-ARI fields SHALL default to 0 AND SHIDO fields SHALL default to 0 AND `matchDuration` SHALL default to 180

### Requirement: Score deduction validates non-negative result

Before applying any score reduction (PART decrement, ALL PARTS decrement), the backend SHALL verify the resulting value is >= 0. The WAZA-ARI count SHALL be decremented by the same amount as the score reduction.

#### Scenario: Score decrement validated before persistence

- **WHEN** a score reduction API call is received
- **THEN** the backend SHALL check that `currentValue + delta >= 0` before writing AND SHALL return HTTP 400 if the check fails

#### Scenario: WAZA-ARI recalculated on valid score reduction

- **WHEN** a score reduction is accepted
- **THEN** the player's WAZA-ARI count SHALL decrease by the absolute value of the delta (minimum 0)
