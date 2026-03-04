## MODIFIED Requirements

### Requirement: Login page requires competition type selection before credential entry

The login page SHALL always display the credential entry form (username/password) as the initial step. Competition type selection SHALL NOT be presented before credential entry. After successful authentication, if the user's assigned event supports multiple competition types, the system SHALL present a competition type selection step. The selected type SHALL be stored in localStorage upon completion and used for routing decisions.

#### Scenario: Login form is the initial page state

- **WHEN** the login page loads regardless of the active event's competition types
- **THEN** the username and password input form SHALL be visible immediately, with no competition type selection screen shown before it

#### Scenario: Successful login stores competition type

- **WHEN** the user completes login with valid credentials
- **THEN** the JWT token, user role, and `competitionType` SHALL all be persisted to localStorage

#### Scenario: Role-based redirect respects competition type

- **WHEN** login succeeds with `competitionType: 'kata'`
- **THEN** the user SHALL be redirected to the kata-specific route for their role (existing behavior unchanged)
- **WHEN** login succeeds with `competitionType: 'creative'`
- **THEN** the user SHALL be redirected to the creative-specific route for their role

#### Scenario: Type selection presented after login for multi-type events

- **WHEN** the user successfully logs in and their assigned event supports both Duo and Show
- **THEN** the system SHALL display the competition type selection step AFTER authentication, allowing the user to choose between "雙人演武" and "創意演武"
