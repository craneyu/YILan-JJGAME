## ADDED Requirements

### Requirement: Login page presents competition type selection

Before entering credentials, the system SHALL display a competition type selection screen with two Card options: "雙人演武" (Kata) and "創意演武" (Creative). The user SHALL select a competition type before the login form becomes accessible.

#### Scenario: User selects Kata competition type

- **WHEN** a user clicks the "雙人演武" Card
- **THEN** the selected card SHALL be visually highlighted using `.score-btn-selected` styling, and the login form SHALL become visible below the cards

#### Scenario: User selects Creative competition type

- **WHEN** a user clicks the "創意演武" Card
- **THEN** the selected card SHALL be visually highlighted and the login form SHALL become visible

#### Scenario: Login form hidden before selection

- **WHEN** the login page first loads
- **THEN** no competition type is selected and the login credentials form SHALL NOT be visible

### Requirement: Selected competition type persists after login

After successful login, the selected competition type SHALL be stored in localStorage as `competitionType` with value `'kata'` or `'creative'`.

#### Scenario: Kata type stored after login

- **WHEN** a user selects "雙人演武" and successfully logs in
- **THEN** `localStorage.getItem('competitionType')` SHALL return `'kata'`

#### Scenario: Creative type stored after login

- **WHEN** a user selects "創意演武" and successfully logs in
- **THEN** `localStorage.getItem('competitionType')` SHALL return `'creative'`

### Requirement: Router directs users based on competition type

After login, the router SHALL redirect users to role-appropriate pages based on `competitionType`:
- `kata`: existing `/judge/scoring`, `/judge/sequence`, `/judge/vr`, `/audience`, `/admin` routes
- `creative`: new `/creative/judge/scoring`, `/creative/judge/sequence`, `/creative/audience`, `/creative/admin` routes

#### Scenario: Scoring judge redirected to correct page after kata login

- **WHEN** a scoring_judge logs in with `competitionType: 'kata'`
- **THEN** the router SHALL navigate to `/judge/scoring`

#### Scenario: Scoring judge redirected to correct page after creative login

- **WHEN** a scoring_judge logs in with `competitionType: 'creative'`
- **THEN** the router SHALL navigate to `/creative/judge/scoring`
