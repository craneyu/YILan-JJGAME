## MODIFIED Requirements

### Requirement: Login page presents competition type selection

Before entering credentials, the system SHALL display a competition type selection screen implementing the "登入頁競賽類型選擇改為事件感知" design decision. The available options SHALL be dynamically determined by fetching the active event's `competitionTypes` array via `GET /api/v1/events?status=active`. Only competition types present in the event's `competitionTypes` SHALL be rendered as selectable cards. If the event supports only one type, that card SHALL be pre-selected and the selection UI SHALL be hidden.

#### Scenario: Active event supports both Duo and Show

- **WHEN** the login page loads and the active event has `competitionTypes: ['Duo', 'Show']`
- **THEN** two cards SHALL be displayed: "雙人演武" and "創意演武", both selectable, with no pre-selection

#### Scenario: Active event supports only Duo

- **WHEN** the login page loads and the active event has `competitionTypes: ['Duo']`
- **THEN** the competition type selection UI SHALL be skipped and `competitionType: 'kata'` SHALL be automatically stored in localStorage, proceeding directly to the login credentials form

#### Scenario: Active event supports only Show

- **WHEN** the login page loads and the active event has `competitionTypes: ['Show']`
- **THEN** the competition type selection UI SHALL be skipped and `competitionType: 'creative'` SHALL be automatically stored in localStorage, proceeding directly to the login credentials form

#### Scenario: Login form hidden before selection when both types available

- **WHEN** the login page first loads and the active event has both types
- **THEN** no competition type is selected and the login credentials form SHALL NOT be visible

---

### Requirement: Selected competition type persists after login

After successful login, the selected competition type SHALL be stored in localStorage as `competitionType` with value `'kata'` (for Duo) or `'creative'` (for Show).

#### Scenario: Duo type stored after login

- **WHEN** a user selects "雙人演武" and successfully logs in
- **THEN** `localStorage.getItem('competitionType')` SHALL return `'kata'`

#### Scenario: Show type stored after login

- **WHEN** a user selects "創意演武" and successfully logs in
- **THEN** `localStorage.getItem('competitionType')` SHALL return `'creative'`

---

### Requirement: Router directs users based on competition type

After login, the router SHALL redirect users to role-appropriate pages based on `competitionType` stored in localStorage:
- `kata`: routes `/judge/scoring`, `/judge/sequence`, `/judge/vr`, `/audience`, `/admin`
- `creative`: routes `/creative/judge/scoring`, `/creative/judge/sequence`, `/creative/audience`, `/creative/admin`

#### Scenario: Scoring judge redirected after kata login

- **WHEN** a scoring_judge logs in with competition type "雙人演武"
- **THEN** the router SHALL navigate to `/judge/scoring`

#### Scenario: Scoring judge redirected after show login

- **WHEN** a scoring_judge logs in with competition type "創意演武"
- **THEN** the router SHALL navigate to `/creative/judge/scoring`
