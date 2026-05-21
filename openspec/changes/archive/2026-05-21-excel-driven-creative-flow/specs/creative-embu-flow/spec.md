## MODIFIED Requirements

### Requirement: Sequence judge advances to the next team

After confirming scores for the current team, the sequence judge SHALL be able to advance to the next team. The system SHALL determine the next team by scanning the team list in **event-specific order**:

- For **tournament events** (`event.meetingType === 'tournament'`): teams SHALL be sorted by `Team.order` ascending (Excel row order). The system SHALL then find the first team after the current position that has fewer than 5 score submissions AND is not in the `abstainedTeamIds` list.
- For **sports-day events** (`event.meetingType === 'sports-day'` or undefined): teams SHALL be sorted using `sortTeams + resolveCategoryOrder('Show')` (existing category-major behavior). The same "first unfinished + non-abstained" rule applies after sorting.

When no remaining team qualifies, the system SHALL set `currentTeamId` to `null` and the front-end SHALL display the completion message.

#### Scenario: Tournament advances to next team in Excel row order

- **WHEN** a tournament event has 9 Show teams imported in a specific order and the sequence judge calls `POST /api/v1/creative/flow/next-team` with `{ eventId }` after team N completes
- **THEN** the system SHALL set `currentTeamId` to team N+1 in the Excel row order (lowest `Team.order` value greater than the current team's order), skipping any team with ≥5 scores or in the abstained list

#### Scenario: Sports-day preserves category-major rotation

- **WHEN** a sports-day event has 9 Show teams (3 female, 4 male, 2 mixed) and sequence judge calls next-team after the last female team completes
- **THEN** the system SHALL advance to the first male team (per `resolveCategoryOrder('Show')`), preserving the pre-change behavior

#### Scenario: Advance to next team broadcasts socket event

- **WHEN** the sequence judge calls `POST /api/v1/creative/flow/next-team` with `{ eventId }`
- **THEN** the system SHALL reset all scoring state for the new team, clear penalty records, reset the timer state, and broadcast a `creative:team-changed` event with the next team's information (or `null` if no more teams remain)

##### Example: 9-team tournament Show executes 9 steps in Excel-row order

- **GIVEN** a tournament event imported from `Show-teams_115錦標賽.xlsx` with 9 teams in order:
  | Row | Team | Category | Tier |
  |-----|------|----------|------|
  | 1 | 大隱國小 (林久芮+簡子茜) | female | EL |
  | 2 | 大隱國小 (廖洛熙+陳冠茗) | mixed | EL |
  | 3 | 大隱國小 (鄭渝霏+游蓁妮) | female | EM |
  | 4 | 大隱國小 (林品言+陳尹稚) | male | EM |
  | 5 | 柯林國小 (王元杰+諶飛諺) | male | EM |
  | 6 | 大隱國小 (陳耘彤+吳彥賢) | mixed | EM |
  | 7 | 柯林國小 (曾霸+曾蔚) | male | EH |
  | 8 | 國華國中 (黃鈺晴+余佩汶) | female | JH |
  | 9 | 國華國中 (李晨凡+吳柏諺) | male | JH |
- **WHEN** the sequence judge initiates from team row 1 and calls next-team after each team completes
- **THEN** the system SHALL produce exactly 9 step transitions in the row order shown above; the 10th next-team call SHALL return `nextTeamId: null`
