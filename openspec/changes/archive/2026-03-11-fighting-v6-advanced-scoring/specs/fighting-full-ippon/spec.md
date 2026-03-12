# fighting-full-ippon Specification

## Purpose

Define the FULL IPPON automatic victory condition: when a player achieves at least 1 IPPON in each of PART 1, PART 2, and PART 3, the system SHALL force the match to end with that player winning at 50 points.

## ADDED Requirements

### Requirement: FULL IPPON detection on backend

After each PART score action, the backend controller SHALL check the player's current IPPON snapshot. If all three PART IPPON counts are ≥ 1 (p1 ≥ 1 AND p2 ≥ 1 AND p3 ≥ 1), the system SHALL trigger FULL IPPON pending state. The match SHALL NOT be auto-finalized; the referee must still confirm.

#### Scenario: All three PART IPPONs achieved

- **WHEN** a referee scores a PART button action that results in p1 ≥ 1, p2 ≥ 1, and p3 ≥ 1 for a player
- **THEN** the backend SHALL set Match status to `full-ippon-pending` AND pause the timer AND emit `match:full-ippon` with `{ matchId, suggestedWinner }` AND set that player's totalScore to 50 AND set the opponent's totalScore to 0

#### Scenario: Not all three PART IPPONs reached

- **WHEN** a referee scores a PART button action but fewer than three PART IPPON counts are ≥ 1
- **THEN** the system SHALL NOT trigger FULL IPPON and the match SHALL continue normally

### Requirement: FULL IPPON Socket broadcast

Upon FULL IPPON detection, the backend SHALL emit a `match:full-ippon` Socket.IO event to all clients in the match room.

#### Scenario: Broadcast payload

- **WHEN** FULL IPPON is triggered
- **THEN** the server SHALL broadcast `match:full-ippon` with payload `{ matchId, winner: 'red' | 'blue', winnerName: string }` to the match room

### Requirement: Audience display FULL IPPON overlay

Upon receiving `match:full-ippon`, the audience display SHALL show a full-screen overlay with the text "FULL IPPON" and the suggested winner's name. The overlay SHALL remain until the match is officially finalized.

#### Scenario: Overlay appears on audience screen

- **WHEN** the audience component receives the `match:full-ippon` Socket event
- **THEN** a full-screen overlay SHALL appear displaying "FULL IPPON" in large text and the suggested winning player's name

#### Scenario: Overlay dismissed on match finalized

- **WHEN** `match:ended` event is received (referee confirmed winner)
- **THEN** the FULL IPPON overlay SHALL be dismissed

### Requirement: Finished match rejects further score actions

A match with status `finished` SHALL reject any additional scoring API calls.

#### Scenario: Score action on finished match

- **WHEN** a referee submits a score action for a match that already has status `finished`
- **THEN** the API SHALL return HTTP 409 Conflict and no score log SHALL be created
