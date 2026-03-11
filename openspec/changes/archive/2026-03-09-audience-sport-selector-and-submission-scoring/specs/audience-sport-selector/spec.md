## ADDED Requirements

### Requirement: Audience sport selector entry page

The system SHALL provide a unified audience entry page at `/audience-select` that automatically detects the active event and presents sport selection options.

The page SHALL be accessible without authentication (no route guard).

#### Scenario: Active event found

- **WHEN** the page loads and `GET /api/v1/events?open=true` returns one or more events
- **THEN** the system SHALL use the first event in the list as the active event and display five sport selection cards

#### Scenario: No active event

- **WHEN** the page loads and `GET /api/v1/events?open=true` returns an empty array
- **THEN** the system SHALL display a message indicating no competition is currently in progress and SHALL NOT show any sport selection cards

### Requirement: Sport selection navigation

The system SHALL display exactly five sport cards with the following navigation targets when an active event is detected:

| Sport | Route |
|-------|-------|
| 演武 (Kata) | `/audience?eventId=<activeEventId>` |
| 創意演武 (Creative Embu) | `/creative/audience?eventId=<activeEventId>` |
| 寢技 (Ne-Waza) | `/match-audience?matchType=ne-waza&eventId=<activeEventId>` |
| 對打 (Fighting) | `/match-audience?matchType=fighting&eventId=<activeEventId>` |
| 格鬥 (Contact) | `/match-audience?matchType=contact&eventId=<activeEventId>` |

#### Scenario: Selecting a sport

- **WHEN** the audience clicks a sport card
- **THEN** the system SHALL navigate to the corresponding audience view with `eventId` as a query parameter

### Requirement: Audience role login redirect

The system SHALL redirect users with the `audience` role to `/audience-select` after successful login.

#### Scenario: Audience login

- **WHEN** a user with `audience` role successfully logs in
- **THEN** the system SHALL navigate to `/audience-select` instead of `/audience`

### Requirement: Match audience dynamic matchType

The `match-audience` component SHALL read `matchType` from the route query parameters instead of using a hardcoded value.

#### Scenario: matchType provided via URL

- **WHEN** the user navigates to `/match-audience?matchType=fighting&eventId=xxx`
- **THEN** the component SHALL load matches filtered by `matchType=fighting`

#### Scenario: matchType not provided

- **WHEN** the user navigates to `/match-audience` without a `matchType` parameter
- **THEN** the component SHALL default to `matchType=ne-waza` for backward compatibility
