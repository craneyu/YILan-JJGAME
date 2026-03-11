# fighting-timer-setup Specification

## Purpose

Define the pre-match timer configuration flow: before a match begins, the referee SHALL select the match duration via a modal offering quick-select options (2 min / 3 min) before the countdown starts.

## ADDED Requirements

### Requirement: Match duration stored in Match model

The Match model SHALL include a `matchDuration` field (Number, seconds, default: 180) to persist the selected duration.

#### Scenario: Default duration is 180 seconds

- **WHEN** a new Match document is created without specifying `matchDuration`
- **THEN** `matchDuration` SHALL default to 180

### Requirement: Timer setup modal shown before match start

When a match is loaded and its status is `pending`, the referee interface SHALL display a timer setup modal before allowing any scoring actions.

#### Scenario: Modal displayed on match load in pending state

- **WHEN** the referee navigates to a match with status `pending`
- **THEN** a modal SHALL be shown with quick-select buttons for 2 minutes (120 s) and 3 minutes (180 s) and a confirm button

#### Scenario: Quick-select 2 min

- **WHEN** the referee clicks the 2-minute quick-select button
- **THEN** the duration input SHALL be set to 120 seconds

#### Scenario: Quick-select 3 min

- **WHEN** the referee clicks the 3-minute quick-select button
- **THEN** the duration input SHALL be set to 180 seconds

### Requirement: Duration confirmed via API before countdown starts

The referee interface SHALL call `PATCH /api/v1/matches/:id/duration` with `{ duration: number }` when the confirm button is clicked. The countdown SHALL NOT start until the API responds with HTTP 200.

#### Scenario: Confirm button saves duration and starts countdown

- **WHEN** the referee confirms the duration selection
- **THEN** the frontend SHALL PATCH the match duration AND upon HTTP 200 response SHALL start the countdown AND SHALL dismiss the modal

#### Scenario: API error blocks start

- **WHEN** the PATCH /duration call returns a non-200 status
- **THEN** the modal SHALL remain open AND a SweetAlert2 error toast SHALL be displayed AND the countdown SHALL NOT start
