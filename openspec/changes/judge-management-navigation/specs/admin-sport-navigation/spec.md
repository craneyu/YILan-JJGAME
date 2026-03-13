## REMOVED Requirements

### Requirement: Admin can access judge management from the sport selection page

**Reason**: Judge management is a global admin operation unrelated to a specific event. Moving the entry point to the event list page reduces navigation depth and improves discoverability.
**Migration**: Use the "裁判管理" button on `/admin/events` (event list page) to access judge management.

#### Scenario: Judge management button no longer appears on sport selection page

- **WHEN** admin navigates to `/admin/events/:eventId`
- **THEN** the sport selection page SHALL NOT display a "裁判管理" button
