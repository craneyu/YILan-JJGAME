## ADDED Requirements

### Requirement: In-page competition type switching after login

After login, authenticated users (scoring judge, sequence judge) and unauthenticated audience viewers SHALL be able to switch competition type from within their respective pages, without returning to the login page. Switching SHALL update the stored `competitionType` and navigate to the equivalent page for the new competition type.

#### Scenario: Scoring judge switches from kata to creative in-page

- **WHEN** a scoring judge is authenticated and viewing `/judge/scoring`
- **AND** their assigned event supports both Duo and Show
- **AND** they activate the in-page competition type switcher
- **THEN** `competitionType: 'creative'` SHALL be persisted in localStorage
- **AND** the user SHALL be navigated to `/creative/scoring`
- **AND** no logout or re-authentication SHALL be required

#### Scenario: Audience switches competition type in-page

- **WHEN** an audience viewer is on `/audience?eventId=<id>`
- **AND** the event has `competitionTypes: ['Duo', 'Show']`
- **AND** they activate the competition type switcher
- **THEN** the viewer SHALL be navigated to `/creative/audience?eventId=<id>`
- **AND** no login is required
