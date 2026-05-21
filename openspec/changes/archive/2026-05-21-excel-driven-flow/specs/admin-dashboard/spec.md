## ADDED Requirements

### Requirement: Tournament events hide category order configuration UI

For events whose `meetingType === 'tournament'`, the admin dashboard SHALL NOT display the category-order configuration block (the "組別順序" drag-and-drop UI for reordering `male` / `female` / `mixed`). This configuration is irrelevant for tournament events because the group execution order is determined entirely by the Excel row order at import time.

For events whose `meetingType === 'sports-day'`, the admin dashboard SHALL continue to display the category-order configuration UI unchanged from prior behavior.

#### Scenario: Tournament admin dashboard hides category order UI

- **WHEN** an administrator navigates to a tournament event's kata management page
- **THEN** the page SHALL NOT render the "組別順序" header label, the inline display of male/female/mixed sequence, or the pen icon button that triggers the reorder editor

#### Scenario: Sports-day admin dashboard preserves category order UI

- **WHEN** an administrator navigates to a sports-day event's kata management page
- **THEN** the page SHALL render the "組別順序" UI exactly as before this change, with the existing drag-and-drop reorder functionality intact
