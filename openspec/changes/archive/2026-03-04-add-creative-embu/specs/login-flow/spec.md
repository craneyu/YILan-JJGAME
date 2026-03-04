## ADDED Requirements

### Requirement: Login page requires competition type selection before credential entry

The login page SHALL present a competition type selection step (Card UI) before showing the username/password form. The user MUST select a competition type first. The selected type SHALL be stored in localStorage upon successful login and used for routing decisions.

#### Scenario: Competition type selection precedes login form

- **WHEN** the login page loads
- **THEN** two competition type Cards SHALL be displayed: "雙人演武" and "創意演武", and the login form SHALL NOT be visible

#### Scenario: Login form appears after type selection

- **WHEN** the user clicks one of the competition type Cards
- **THEN** the selected Card SHALL be highlighted and the username/password form SHALL appear below

#### Scenario: Successful login stores competition type

- **WHEN** the user completes login with valid credentials
- **THEN** the JWT token, user role, and `competitionType` SHALL all be persisted to localStorage

#### Scenario: Role-based redirect respects competition type

- **WHEN** login succeeds with `competitionType: 'kata'`
- **THEN** the user SHALL be redirected to the kata-specific route for their role (existing behavior unchanged)
- **WHEN** login succeeds with `competitionType: 'creative'`
- **THEN** the user SHALL be redirected to the creative-specific route for their role
