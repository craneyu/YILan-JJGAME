# admin-dashboard Specification

## Purpose

TBD - created by archiving change 'add-creative-embu'. Update Purpose after archive.

## Requirements

### Requirement: Admin can create and manage creative embu events

The admin dashboard SHALL allow the admin to create events that support one or both competition types (`Duo` and `Show`). When creating an event, the admin SHALL select which competition types to enable using a multi-select checkbox group. An event SHALL support `competitionTypes: ('Duo' | 'Show')[]` with a minimum of one type selected. The `Event` model SHALL use `competitionTypes` array instead of a single `competitionType` value, implementing the "Event 模型改用 competitionTypes 陣列" design decision. Both `game_states` and `creative_game_states` SHALL remain independent collections — implementing "game_states 與 creative_game_states 維持各自獨立" — each initialized only when their respective type is enabled.

#### Scenario: Admin creates an event with both Duo and Show types

- **WHEN** the admin selects both "雙人演武" and "創意演武" checkboxes and submits the event creation form
- **THEN** the system SHALL create an event with `competitionTypes: ['Duo', 'Show']` and initialize both a `/game_states` document and a `/creative_game_states` document for that event

#### Scenario: Admin creates an event with only Duo type

- **WHEN** the admin selects only "雙人演武" and submits the event creation form
- **THEN** the system SHALL create an event with `competitionTypes: ['Duo']` and initialize only a `/game_states` document

#### Scenario: Admin views a unified event with both types

- **WHEN** the admin opens an event whose `competitionTypes` includes both `'Duo'` and `'Show'`
- **THEN** the event card SHALL display two distinct sections: a "雙人演武" section and a "創意演武" section, each with their own team list, score summary, rankings, and export buttons


<!-- @trace
source: unified-event-management
updated: 2026-03-04
code:
  - backend/src/models/CreativeGameState.ts
  - backend/src/routes/creativeScores.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.html
  - frontend/src/app/app.routes.ts
  - backend/src/controllers/creativeTimerController.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/routes/creativePenalties.ts
  - backend/src/routes/creativeFlow.ts
  - backend/src/controllers/creativeRankingsController.ts
  - backend/src/models/Event.ts
  - backend/src/models/CreativePenalty.ts
  - frontend/src/app/features/login/login.component.html
  - SPEC/SPEC-v3.md
  - backend/src/routes/events.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - backend/src/sockets/index.ts
  - frontend/src/app/features/login/login.component.ts
  - backend/src/controllers/creativeFlowController.ts
  - SPEC/SPEC-v2.md
  - backend/src/utils/creativeScoring.ts
  - backend/src/controllers/creativeScoreController.ts
  - backend/src/seeds/migrateEventTypes.ts
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts
  - backend/src/models/Team.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html
  - backend/src/controllers/creativePenaltyController.ts
  - backend/src/models/CreativeScore.ts
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/index.ts
  - backend/src/controllers/teamController.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.ts
  - backend/src/controllers/eventController.ts
-->

---
### Requirement: Admin can import teams for creative events

The admin SHALL be able to import teams for each competition type separately within the same event, following the "Admin 隊伍匯入：分軌操作而非 CSV 新增欄位" design decision. The CSV format SHALL remain unchanged (`Team Name, Member 1, Member 2, Category`). The admin SHALL use separate import buttons or sections for `Duo` teams and `Show` teams. The backend SHALL accept a `competitionType` parameter on `POST /events/:id/teams/import` to tag imported teams accordingly.

#### Scenario: Admin imports Duo teams

- **WHEN** the admin clicks the "匯入雙人演武隊伍" import button in the Duo section and uploads a CSV file
- **THEN** all imported teams SHALL be created with `competitionType: 'Duo'` associated with that event, with duplicate name validation

#### Scenario: Admin imports Show teams

- **WHEN** the admin clicks the "匯入創意演武隊伍" import button in the Show section and uploads a CSV file
- **THEN** all imported teams SHALL be created with `competitionType: 'Show'` associated with that event, with duplicate name validation


<!-- @trace
source: unified-event-management
updated: 2026-03-04
code:
  - backend/src/models/CreativeGameState.ts
  - backend/src/routes/creativeScores.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.html
  - frontend/src/app/app.routes.ts
  - backend/src/controllers/creativeTimerController.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/routes/creativePenalties.ts
  - backend/src/routes/creativeFlow.ts
  - backend/src/controllers/creativeRankingsController.ts
  - backend/src/models/Event.ts
  - backend/src/models/CreativePenalty.ts
  - frontend/src/app/features/login/login.component.html
  - SPEC/SPEC-v3.md
  - backend/src/routes/events.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - backend/src/sockets/index.ts
  - frontend/src/app/features/login/login.component.ts
  - backend/src/controllers/creativeFlowController.ts
  - SPEC/SPEC-v2.md
  - backend/src/utils/creativeScoring.ts
  - backend/src/controllers/creativeScoreController.ts
  - backend/src/seeds/migrateEventTypes.ts
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts
  - backend/src/models/Team.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html
  - backend/src/controllers/creativePenaltyController.ts
  - backend/src/models/CreativeScore.ts
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/index.ts
  - backend/src/controllers/teamController.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.ts
  - backend/src/controllers/eventController.ts
-->

---
### Requirement: Admin can view creative embu rankings

The admin SHALL be able to view rankings for both Duo and Show competition types within a single event card. Rankings SHALL be grouped by category (male/female/mixed) within each competition type section. Export buttons (Excel and PDF) SHALL be available per category per competition type.

#### Scenario: Admin views Duo rankings in unified event

- **WHEN** the admin opens the Duo rankings section of a unified event
- **THEN** teams with `competitionType: 'Duo'` SHALL be ranked by total score descending within each category

#### Scenario: Admin views Show rankings in unified event

- **WHEN** the admin opens the Show rankings section of a unified event
- **THEN** teams with `competitionType: 'Show'` SHALL be ranked by `finalScore` descending within each category, using the creative scoring formula


<!-- @trace
source: unified-event-management
updated: 2026-03-04
code:
  - backend/src/models/CreativeGameState.ts
  - backend/src/routes/creativeScores.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.html
  - frontend/src/app/app.routes.ts
  - backend/src/controllers/creativeTimerController.ts
  - frontend/src/app/features/admin/admin.component.ts
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/routes/creativePenalties.ts
  - backend/src/routes/creativeFlow.ts
  - backend/src/controllers/creativeRankingsController.ts
  - backend/src/models/Event.ts
  - backend/src/models/CreativePenalty.ts
  - frontend/src/app/features/login/login.component.html
  - SPEC/SPEC-v3.md
  - backend/src/routes/events.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - backend/src/sockets/index.ts
  - frontend/src/app/features/login/login.component.ts
  - backend/src/controllers/creativeFlowController.ts
  - SPEC/SPEC-v2.md
  - backend/src/utils/creativeScoring.ts
  - backend/src/controllers/creativeScoreController.ts
  - backend/src/seeds/migrateEventTypes.ts
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts
  - backend/src/models/Team.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html
  - backend/src/controllers/creativePenaltyController.ts
  - backend/src/models/CreativeScore.ts
  - frontend/src/app/core/services/auth.service.ts
  - backend/src/index.ts
  - backend/src/controllers/teamController.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.ts
  - backend/src/controllers/eventController.ts
-->

---
### Requirement: Admin can export creative embu results

The admin SHALL be able to export results for creative events. Two export formats SHALL be supported:
- **Excel (.xlsx)**: Per-category sheet with rank, team name, members, technicalTotal, artisticTotal, grandTotal, penaltyDeduction, finalScore, and a dedicated "扣分原因" column. The "扣分原因" column SHALL display comma-separated deduction entries (e.g., "超時 -1.0、使用道具 -1.0") when `penaltyDeduction > 0`, and SHALL be empty when there are no deductions.
- **PDF**: Per-category printable format with all teams ranked, chief judge signature area, A4 landscape orientation. When a team has `penaltyDeduction > 0`, the deduction cell SHALL display the amount followed by the deduction reasons in parentheses (e.g., `-2.0 (超時, 使用道具)`).

Abstained teams (where `isAbstained === true`) SHALL appear in the export with a "棄權" note in the rank column and a dash (`—`) in all score columns.

#### Scenario: Admin exports Excel for creative event

- **WHEN** the admin clicks the Excel export button for a creative event category
- **THEN** the system SHALL download an `.xlsx` file with the category's ranked results including all score fields and a "扣分原因" column

#### Scenario: Excel export includes deduction reasons for penalized teams

- **WHEN** a team in the exported category has `penaltyDeduction > 0` with violation types recorded in `CreativePenalty`
- **THEN** the "扣分原因" cell for that team's row SHALL contain a text description of each violation type and its deduction amount (e.g., "超時 -1.0、使用道具 -1.0")

#### Scenario: Excel export shows empty deduction reason for clean teams

- **WHEN** a team has no violations (`penaltyDeduction === 0`)
- **THEN** the "扣分原因" cell SHALL be empty

#### Scenario: Admin exports PDF for creative event

- **WHEN** the admin clicks the PDF export button for a creative event category
- **THEN** the system SHALL download an A4 landscape PDF with ranked teams and a signature area

#### Scenario: PDF export shows deduction reason inline

- **WHEN** a team has `penaltyDeduction > 0` in the PDF export
- **THEN** the deduction amount SHALL be followed by parenthesized reason text (e.g., `-2.0 (超時, 使用道具)`)

#### Scenario: Abstained teams appear in export with special notation

- **WHEN** an abstained team is included in the export
- **THEN** its rank column SHALL display "棄權" and all score columns SHALL display "—"


<!-- @trace
source: add-creative-abstain-export-notes
updated: 2026-03-05
code:
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/sequence-judge/sequence-judge.component.ts
  - backend/src/controllers/creativeFlowController.ts
  - backend/src/models/CreativeGameState.ts
  - .github/skills/spectra-debug/SKILL.md
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.html
  - frontend/src/app/features/sequence-judge/sequence-judge.component.html
  - backend/src/controllers/creativeRankingsController.ts
  - .github/prompts/spectra-ask.prompt.md
  - .github/prompts/spectra-propose.prompt.md
  - .github/skills/spectra-propose/SKILL.md
  - .github/skills/spectra-ask/SKILL.md
  - .github/prompts/spectra-debug.prompt.md
  - backend/src/controllers/flowController.ts
  - .github/prompts/spectra-audit.prompt.md
  - .github/skills/spectra-apply/SKILL.md
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/routes/creativeFlow.ts
  - .github/prompts/spectra-archive.prompt.md
  - backend/src/controllers/eventController.ts
  - .github/skills/spectra-archive/SKILL.md
  - .github/skills/spectra-audit/SKILL.md
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.ts
  - .github/prompts/spectra-apply.prompt.md
-->

---
### Requirement: Admin can selectively clear scores per competition type from the dashboard

The admin dashboard SHALL display up to three score-clearing actions per event, depending on which competition types are enabled on the event:

- "清除雙人演武成績" — visible only when the event includes `competitionTypes: ['Duo', ...]`
- "清除創意演武成績" — visible only when the event includes `competitionTypes: [..., 'Show']`
- "清除全部成績" — always visible

Each action SHALL display a SweetAlert2 confirmation dialog naming the specific type being cleared before proceeding. The dialog SHALL explicitly state that the operation is irreversible.

On confirmation, the frontend SHALL call `DELETE /api/v1/events/:id/scores` with the appropriate `type` query parameter (`Duo`, `Show`, or omitted for all). On success, the frontend SHALL display a toast notification showing the count of deleted records.

#### Scenario: Event with both Duo and Show types shows three buttons

- **WHEN** admin views an event card where `competitionTypes` includes both `Duo` and `Show`
- **THEN** three clearing buttons SHALL be displayed: "清除雙人演武成績", "清除創意演武成績", and "清除全部成績"

#### Scenario: Event with only Duo shows one type button plus all-clear

- **WHEN** admin views an event card where `competitionTypes` is `['Duo']`
- **THEN** only "清除雙人演武成績" and "清除全部成績" SHALL be displayed
- **AND** "清除創意演武成績" SHALL NOT be displayed

#### Scenario: Confirmation dialog names the clearing scope

- **WHEN** admin clicks "清除雙人演武成績"
- **THEN** a SweetAlert2 confirmation dialog SHALL appear with text indicating that all 雙人演武 scores will be permanently deleted

#### Scenario: Success toast shows deleted record count

- **WHEN** admin confirms a selective clear and the API returns successfully
- **THEN** a toast notification SHALL appear showing the number of deleted score records

<!-- @trace
source: clear-scores-by-type
updated: 2026-03-04
code:
  - frontend/src/app/features/creative-audience/creative-audience.component.html
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.html
  - CLAUDE.md
  - .github/skills/spectra-ask/SKILL.md
  - .github/prompts/spectra-archive.prompt.md
  - .github/skills/spectra-archive/SKILL.md
  - .github/skills/spectra-apply/SKILL.md
  - .github/skills/spectra-debug/SKILL.md
  - frontend/src/app/features/creative-audience/creative-audience.component.ts
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html
  - AGENTS.md
  - backend/src/models/CreativeGameState.ts
  - frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.ts
  - backend/src/controllers/creativePenaltyController.ts
  - .github/skills/spectra-discuss/SKILL.md
  - .github/prompts/spectra-debug.prompt.md
  - backend/src/controllers/creativeTimerController.ts
  - backend/src/controllers/creativeFlowController.ts
  - .github/prompts/spectra-apply.prompt.md
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts
  - backend/src/controllers/creativeScoreController.ts
  - .github/skills/spectra-propose/SKILL.md
  - frontend/src/app/core/services/socket.service.ts
  - .github/prompts/spectra-ask.prompt.md
  - backend/src/controllers/teamController.ts
  - SPEC/SPEC-v3.md
  - backend/src/routes/creativeFlow.ts
  - backend/src/controllers/eventController.ts
  - .github/prompts/spectra-discuss.prompt.md
  - .github/prompts/spectra-propose.prompt.md
  - frontend/src/app/features/admin/admin.component.ts
-->

---
### Requirement: Results export splits files by category and tier for tournament events

For tournament events, the admin results export feature SHALL produce one Excel file and one PDF file per `(category, tier)` group. File names SHALL include both category and tier identifiers (e.g., `男子組_國小高年級.xlsx`, `女子組_公開組.pdf`). For sports-day events, the existing one-file-per-category behavior SHALL be preserved unchanged.

#### Scenario: Tournament event export produces per-group files

- **WHEN** admin clicks "匯出 Excel" for a tournament event containing teams in `(male, EH)`, `(male, JH)`, and `(female, OPEN)`
- **THEN** the system SHALL produce three separate Excel files, one for each `(category, tier)` group, and each file SHALL contain only the teams belonging to that group

##### Example: export file naming

| Event teams | Generated files |
| ----------- | --------------- |
| Tournament: male EH (3), male JH (4), female OPEN (2) | `男子組_國小高年級.xlsx`, `男子組_國高中.xlsx`, `女子組_公開組.xlsx` (3 files) |
| Tournament: male EL (1) only | `男子組_國小低年級.xlsx` (1 file) |
| Sports-day: male (5), female (3), mixed (2) | `男子組.xlsx`, `女子組.xlsx`, `混合組.xlsx` (3 files, existing behavior) |

#### Scenario: Sports-day export preserves existing naming

- **WHEN** admin clicks "匯出 Excel" for a sports-day event containing male, female, and mixed teams
- **THEN** the generated file names SHALL be `男子組.xlsx`, `女子組.xlsx`, `混合組.xlsx`, identical to pre-change behavior


<!-- @trace
source: jujitsu-tournament-expansion
updated: 2026-05-20
code:
  - SPEC/錦標賽規格需求/SPEC-v3.md
  - backend/src/controllers/flowController.ts
  - .spectra.yaml
  - backend/src/utils/teamSort.ts
  - .github/prompts/spectra-commit.prompt.md
  - .github/prompts/spectra-drift.prompt.md
  - .github/skills/spectra-commit/SKILL.md
  - backend/src/models/Match.ts
  - CLAUDE.md
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/controllers/wrongAttackController.ts
  - backend/src/models/Event.ts
  - frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.html
  - frontend/src/app/features/sequence-judge/sequence-judge.component.ts
  - .github/prompts/spectra-ingest.prompt.md
  - .github/skills/spectra-discuss/SKILL.md
  - .github/prompts/spectra-ask.prompt.md
  - .github/prompts/spectra-archive.prompt.md
  - .github/skills/spectra-drift/SKILL.md
  - .github/skills/spectra-apply/SKILL.md
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts
  - .github/skills/spectra-archive/SKILL.md
  - frontend/src/app/features/admin/event-list/event-list.component.html
  - frontend/src/app/features/audience/audience.component.ts
  - backend/src/controllers/eventController.ts
  - backend/src/models/Team.ts
  - backend/src/controllers/vrScoreController.ts
  - .github/prompts/spectra-discuss.prompt.md
  - .github/prompts/spectra-debug.prompt.md
  - .github/prompts/spectra-audit.prompt.md
  - backend/src/controllers/teamController.ts
  - .github/skills/spectra-ingest/SKILL.md
  - backend/src/controllers/creativePenaltyController.ts
  - frontend/src/app/features/vr-judge/vr-judge.component.html
  - .github/skills/spectra-propose/SKILL.md
  - backend/src/utils/tournament.ts
  - frontend/src/app/features/vr-judge/vr-judge.component.ts
  - .github/prompts/spectra-apply.prompt.md
  - frontend/src/app/features/admin/event-list/event-list.component.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/core/models/match.model.ts
  - AGENTS.md
  - .github/prompts/spectra-propose.prompt.md
  - SPEC/錦標賽規格需求/SPEC-v2.md
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html
-->

---
### Requirement: Tournament export omits VR columns for elementary tier groups

For tournament event exports of elementary tier `(category, tier)` groups (EL, EM, EH), the generated Excel and PDF files SHALL omit all VR-related columns (VR_A, VR_B, VR_C, throwVariety, groundVariety). The grand total formula SHALL exclude any VR contribution.

#### Scenario: EL group export omits VR columns

- **WHEN** admin exports results for a tournament event and the resulting `男子組_國小低年級.xlsx` is opened
- **THEN** the file SHALL NOT contain any column with `VR` in its header, and the grand total cell SHALL sum only motion subtotals

#### Scenario: JH group export retains VR columns

- **WHEN** admin exports results for a tournament event and the resulting `男子組_國高中.xlsx` is opened
- **THEN** the file SHALL contain VR_A, VR_B, VR_C columns and the grand total SHALL include VR contributions (existing behavior preserved for JH and OPEN)

<!-- @trace
source: jujitsu-tournament-expansion
updated: 2026-05-20
code:
  - SPEC/錦標賽規格需求/SPEC-v3.md
  - backend/src/controllers/flowController.ts
  - .spectra.yaml
  - backend/src/utils/teamSort.ts
  - .github/prompts/spectra-commit.prompt.md
  - .github/prompts/spectra-drift.prompt.md
  - .github/skills/spectra-commit/SKILL.md
  - backend/src/models/Match.ts
  - CLAUDE.md
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/controllers/wrongAttackController.ts
  - backend/src/models/Event.ts
  - frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.html
  - frontend/src/app/features/sequence-judge/sequence-judge.component.ts
  - .github/prompts/spectra-ingest.prompt.md
  - .github/skills/spectra-discuss/SKILL.md
  - .github/prompts/spectra-ask.prompt.md
  - .github/prompts/spectra-archive.prompt.md
  - .github/skills/spectra-drift/SKILL.md
  - .github/skills/spectra-apply/SKILL.md
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.ts
  - .github/skills/spectra-archive/SKILL.md
  - frontend/src/app/features/admin/event-list/event-list.component.html
  - frontend/src/app/features/audience/audience.component.ts
  - backend/src/controllers/eventController.ts
  - backend/src/models/Team.ts
  - backend/src/controllers/vrScoreController.ts
  - .github/prompts/spectra-discuss.prompt.md
  - .github/prompts/spectra-debug.prompt.md
  - .github/prompts/spectra-audit.prompt.md
  - backend/src/controllers/teamController.ts
  - .github/skills/spectra-ingest/SKILL.md
  - backend/src/controllers/creativePenaltyController.ts
  - frontend/src/app/features/vr-judge/vr-judge.component.html
  - .github/skills/spectra-propose/SKILL.md
  - backend/src/utils/tournament.ts
  - frontend/src/app/features/vr-judge/vr-judge.component.ts
  - .github/prompts/spectra-apply.prompt.md
  - frontend/src/app/features/admin/event-list/event-list.component.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/core/models/match.model.ts
  - AGENTS.md
  - .github/prompts/spectra-propose.prompt.md
  - SPEC/錦標賽規格需求/SPEC-v2.md
  - frontend/src/app/features/creative-sequence-judge/creative-sequence-judge.component.html
-->

---
### Requirement: Tournament events hide category order configuration UI

For events whose `meetingType === 'tournament'`, the admin dashboard SHALL NOT display the category-order configuration block (the "組別順序" drag-and-drop UI for reordering `male` / `female` / `mixed`). This configuration is irrelevant for tournament events because the group execution order is determined entirely by the Excel row order at import time.

For events whose `meetingType === 'sports-day'`, the admin dashboard SHALL continue to display the category-order configuration UI unchanged from prior behavior.

#### Scenario: Tournament admin dashboard hides category order UI

- **WHEN** an administrator navigates to a tournament event's kata management page
- **THEN** the page SHALL NOT render the "組別順序" header label, the inline display of male/female/mixed sequence, or the pen icon button that triggers the reorder editor

#### Scenario: Sports-day admin dashboard preserves category order UI

- **WHEN** an administrator navigates to a sports-day event's kata management page
- **THEN** the page SHALL render the "組別順序" UI exactly as before this change, with the existing drag-and-drop reorder functionality intact
