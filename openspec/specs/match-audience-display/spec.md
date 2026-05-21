# match-audience-display Specification

## Purpose

TBD - created by archiving change 'add-ne-waza-scoring'. Update Purpose after archive.

## Requirements

### Requirement: Audience display is publicly accessible without authentication

The `/match-audience` route SHALL be accessible without a JWT token.

The audience page SHALL join the Socket.IO event room using the `eventId` query parameter.

#### Scenario: Access audience display without login

- **WHEN** a browser navigates to `/match-audience?eventId=<id>`
- **THEN** the page loads without redirecting to login
- **AND** the page joins the Socket.IO room for that eventId


<!-- @trace
source: add-ne-waza-scoring
updated: 2026-03-09
code:
  - docker-compose.yml
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - backend/src/models/User.ts
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - backend/src/models/Match.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - backend/src/index.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/services/auth.service.ts
  - frontend/src/app/app.routes.ts
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/login/login.component.html
  - backend/src/controllers/matchScoreController.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/core/models/match.model.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - backend/src/seeds/initialUsers.ts
  - backend/src/routes/matchScores.ts
-->

---
### Requirement: Audience display shows current match information

The display SHALL show the following when a match is in progress:

- Match type label (寢技 Ne-Waza / 對打 Fighting / 格鬥 Contact)
- Category and weight class (e.g., 男子組 · -62公斤級)
- Red side: team name, player name, score, advantage count
- Blue side: team name, player name, score, advantage count
- Match timer (remaining time, counting down)
- Status indicator: 進行中 / 暫停中 / 傷停處理中

When no match is in progress, the display SHALL show a waiting screen: "等待下一場比賽"

#### Scenario: Display updates when score is recorded

- **WHEN** match_referee records a 4-point score for red
- **THEN** within 1 second, the audience display shows red score incremented by 4

#### Scenario: Display shows waiting state

- **WHEN** no match has `status: 'in-progress'` in the current event
- **THEN** the audience display shows "等待下一場比賽"


<!-- @trace
source: add-ne-waza-scoring
updated: 2026-03-09
code:
  - docker-compose.yml
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - backend/src/models/User.ts
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - backend/src/models/Match.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - backend/src/index.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/services/auth.service.ts
  - frontend/src/app/app.routes.ts
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/login/login.component.html
  - backend/src/controllers/matchScoreController.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/core/models/match.model.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - backend/src/seeds/initialUsers.ts
  - backend/src/routes/matchScores.ts
-->

---
### Requirement: Audience display receives socket events for real-time updates

The display SHALL listen to the following Socket.IO events on the event room:

- `match:score-updated` → update red/blue scores, advantages, warnings displayed
- `match:timer-updated` → update the countdown timer display
- `match:ended` → show winner banner and stop timer
- `match:advancement-resolved` → when the displayed match's `_id` matches the event payload's `matchId`, update the corresponding `redPlayer` or `bluePlayer` info shown to spectators

The `match:advancement-resolved` payload SHALL have the TypeScript shape:

```typescript
interface MatchAdvancementResolvedPayload {
  matchId: string;
  side: "red" | "blue";
  playerName: string;
  teamName: string;
  fromMatchNo: number;
}
```

#### Scenario: Score update received

- **WHEN** `match:score-updated` is received with `{ matchId, side: 'blue', scores: { blue: 7 } }`
- **THEN** the blue score display updates to 7

#### Scenario: Match ended event received

- **WHEN** `match:ended` is received with `{ winner: 'red', method: 'submission' }`
- **THEN** a prominent winner banner appears: "🏆 紅方勝 (降伏勝)"
- **AND** the timer stops

#### Scenario: Advancement resolution updates currently displayed match

- **GIVEN** the audience display is currently showing Match #16 with red column rendering placeholder `"3 勝者"`
- **WHEN** the display receives `match:advancement-resolved` with `{ matchId: <#16 id>, side: "red", playerName: "陳冠茗", teamName: "Jabari", fromMatchNo: 3 }`
- **THEN** the red player name and team name on the audience display SHALL update to `"陳冠茗"` / `"Jabari"` without requiring a manual reload

#### Scenario: Advancement resolution for a different match is ignored on display

- **GIVEN** the audience display is currently showing Match #5
- **WHEN** the display receives `match:advancement-resolved` with `matchId` of Match #16
- **THEN** the displayed Match #5 SHALL NOT change


<!-- @trace
source: ne-waza-tournament-import
updated: 2026-05-21
code:
  - frontend/src/app/features/match-audience/match-audience.component.html
  - frontend/src/app/core/utils/matchImport.ts
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - backend/src/controllers/matchController.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.ts
  - frontend/src/app/core/models/match.model.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html
  - backend/src/utils/matchPropagation.ts
  - frontend/src/app/core/utils/matchDisplay.ts
  - frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts
  - backend/src/sockets/index.ts
  - backend/src/utils/tournament.ts
  - backend/src/seeds/migrateNeWazaTier.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/ne-waza-audience/ne-waza-audience.component.html
  - backend/src/models/Match.ts
tests:
  - backend/src/utils/__test__/bulkCreateMatches.test.ts
  - backend/src/utils/__test__/updateMatchPropagation.test.ts
  - backend/src/utils/__test__/matchPropagation.test.ts
-->

---
### Requirement: Audience display supports fullscreen mode

The display SHALL provide a fullscreen toggle button that hides browser UI (address bar, tabs) for dedicated display screen use.

#### Scenario: Enter fullscreen

- **WHEN** user clicks the fullscreen button
- **THEN** the page enters browser fullscreen mode via the Fullscreen API
- **AND** the button icon toggles to a compress icon

<!-- @trace
source: add-ne-waza-scoring
updated: 2026-03-09
code:
  - docker-compose.yml
  - backend/src/routes/matches.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.html
  - frontend/src/app/features/admin/match-management/match-management.component.html
  - backend/src/models/User.ts
  - frontend/src/app/app.config.ts
  - frontend/src/app/features/admin/admin-sport-selector/admin-sport-selector.component.ts
  - backend/src/models/Match.ts
  - frontend/src/app/features/login/login.component.ts
  - frontend/src/app/features/admin/admin.component.ts
  - backend/src/controllers/matchController.ts
  - frontend/src/app/core/services/socket.service.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - backend/src/index.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/core/services/auth.service.ts
  - frontend/src/app/app.routes.ts
  - SPEC/SPEC-v4.md
  - frontend/src/app/features/login/login.component.html
  - backend/src/controllers/matchScoreController.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/admin/match-management/match-management.component.ts
  - frontend/src/app/core/models/match.model.ts
  - frontend/src/app/features/admin/admin.component.html
  - frontend/src/app/features/match-referee/match-referee.component.html
  - frontend/src/app/core/interceptors/auth.interceptor.ts
  - backend/src/seeds/initialUsers.ts
  - backend/src/routes/matchScores.ts
-->

---
### Requirement: Audience score sections have color-coded borders and labels

The red player's row SHALL have a border using a light pink color (e.g., `border-red-400/40`) and a drop shadow (e.g., `shadow-lg shadow-red-900/20`).

The blue player's row SHALL have a border using a light blue color (e.g., `border-blue-400/40`) and a drop shadow (e.g., `shadow-lg shadow-blue-900/20`).

Each player's large score block SHALL have a "得分" label displayed directly above it.

#### Scenario: Score section borders visible

- **WHEN** the audience display shows an active match
- **THEN** the red player row SHALL display a pink-tinted border and shadow
- **THEN** the blue player row SHALL display a blue-tinted border and shadow

#### Scenario: Score label displayed

- **WHEN** the audience display shows an active match
- **THEN** a "得分" label SHALL appear above the large score block for both red and blue players


<!-- @trace
source: match-ui-v5
updated: 2026-03-10
code:
  - SPEC/SPEC-v5.md
  - frontend/src/app/features/match-audience/match-audience.component.html
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - .github/skills/spectra-propose/SKILL.md
  - frontend/src/app/features/match-referee/match-referee.component.html
  - .github/prompts/spectra-apply.prompt.md
  - .github/skills/spectra-apply/SKILL.md
  - .github/prompts/spectra-propose.prompt.md
-->

---
### Requirement: Audience warning display uses yellow card grid

The warning count for each player SHALL be displayed as a 2×2 grid of four square boxes.

When a player has N warnings, the first N boxes SHALL be filled yellow (`bg-yellow-400`). The remaining boxes SHALL be gray (`bg-white/20`).

The warning count SHALL NOT exceed 4. All four boxes filled indicates the player has reached the warning limit.

#### Scenario: Player has 2 warnings

- **WHEN** a player has 2 warnings
- **THEN** 2 boxes SHALL be yellow and 2 boxes SHALL be gray in the 2×2 grid

#### Scenario: Player has 0 warnings

- **WHEN** a player has 0 warnings
- **THEN** all 4 boxes SHALL be gray

#### Scenario: Player has 4 warnings (maximum)

- **WHEN** a player has 4 warnings
- **THEN** all 4 boxes SHALL be yellow


<!-- @trace
source: match-ui-v5
updated: 2026-03-10
code:
  - SPEC/SPEC-v5.md
  - frontend/src/app/features/match-audience/match-audience.component.html
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - .github/skills/spectra-propose/SKILL.md
  - frontend/src/app/features/match-referee/match-referee.component.html
  - .github/prompts/spectra-apply.prompt.md
  - .github/skills/spectra-apply/SKILL.md
  - .github/prompts/spectra-propose.prompt.md
-->

---
### Requirement: Warning and advantage positions are swapped in audience display

The layout order for each player's stat section SHALL be: **警告 (warning) first, then 優勢 (advantage)** when displayed from left to right.

This is the reverse of the previous layout which showed advantage before warning.

#### Scenario: Layout order confirmed

- **WHEN** the audience display shows an active match
- **THEN** the warning grid SHALL appear to the LEFT of the advantage count for each player

<!-- @trace
source: match-ui-v5
updated: 2026-03-10
code:
  - SPEC/SPEC-v5.md
  - frontend/src/app/features/match-audience/match-audience.component.html
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - .github/skills/spectra-propose/SKILL.md
  - frontend/src/app/features/match-referee/match-referee.component.html
  - .github/prompts/spectra-apply.prompt.md
  - .github/skills/spectra-apply/SKILL.md
  - .github/prompts/spectra-propose.prompt.md
-->

---
### Requirement: FULL IPPON overlay on audience display

The audience display SHALL render a full-screen overlay when a `match:full-ippon` Socket event is received.

#### Scenario: FULL IPPON overlay appears

- **WHEN** the audience component receives `match:full-ippon` with `{ matchId, winner, winnerName }`
- **THEN** a fixed full-screen overlay SHALL appear with text "FULL IPPON" in large bold yellow text and the winner's name below

#### Scenario: FULL IPPON overlay dismissed on next match

- **WHEN** a `match:started` or `match:reset` event is received
- **THEN** the FULL IPPON overlay SHALL be dismissed automatically


<!-- @trace
source: fighting-v6-advanced-scoring
updated: 2026-03-11
code:
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/models/Match.ts
  - backend/src/controllers/matchController.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/core/models/match.model.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - backend/src/controllers/matchScoreController.ts
  - backend/src/routes/matchScores.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/features/match-referee/match-referee.component.html
  - SPEC/SPEC-v6.md
-->

---
### Requirement: CHUI badge on audience player row

The audience display SHALL show a CHUI badge for each player when their CHUI count is ≥ 1.

#### Scenario: CHUI badge visible at count 1

- **WHEN** a player's CHUI count is 1 or 2
- **THEN** the audience display SHALL show a CHUI badge with the numeric count next to that player's name

#### Scenario: No CHUI badge at zero

- **WHEN** a player's CHUI count is 0
- **THEN** no CHUI badge SHALL appear for that player


<!-- @trace
source: fighting-v6-advanced-scoring
updated: 2026-03-11
code:
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/models/Match.ts
  - backend/src/controllers/matchController.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/core/models/match.model.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - backend/src/controllers/matchScoreController.ts
  - backend/src/routes/matchScores.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/features/match-referee/match-referee.component.html
  - SPEC/SPEC-v6.md
-->

---
### Requirement: PART scores displayed on audience player row

The audience display SHALL show each player's PART 1, PART 2, and PART 3 scores in order.

#### Scenario: PART score row rendered

- **WHEN** a match is in progress with PART scores recorded
- **THEN** the audience display SHALL render a PART score row per player showing PART 1, PART 2, PART 3 values in left-to-right order

<!-- @trace
source: fighting-v6-advanced-scoring
updated: 2026-03-11
code:
  - frontend/src/app/core/services/socket.service.ts
  - backend/src/models/Match.ts
  - backend/src/controllers/matchController.ts
  - backend/src/sockets/index.ts
  - frontend/src/app/core/models/match.model.ts
  - backend/src/models/MatchScoreLog.ts
  - frontend/src/app/features/match-audience/match-audience.component.html
  - backend/src/controllers/matchScoreController.ts
  - backend/src/routes/matchScores.ts
  - frontend/src/app/features/match-referee/match-referee.component.ts
  - frontend/src/app/features/match-audience/match-audience.component.ts
  - frontend/src/app/features/match-referee/match-referee.component.html
  - SPEC/SPEC-v6.md
-->

---
### Requirement: OSAE KOMI display positioned between player name and score cards

The OSAE KOMI display SHALL be rendered as a dedicated flex element between the player name section and the score card section (WAZA-ARI / SHIDO), not inline with the player name.

When OSAE KOMI is not active, this middle section SHALL occupy zero width and SHALL NOT affect the layout.

When OSAE KOMI is active, the section SHALL expand to display the countdown timer, label, and progress bar as a vertically stacked column centered within the available space.

#### Scenario: OSAE KOMI appears between name and scores

- **WHEN** `osae-komi:started` is received for the red player
- **THEN** the OSAE KOMI display SHALL appear as a separate flex item between the red player name area and the WAZA-ARI/SHIDO cards
- **AND** the player name area and score cards SHALL remain visible on either side

#### Scenario: OSAE KOMI hidden when inactive

- **WHEN** OSAE KOMI is not active for a player
- **THEN** no OSAE KOMI element SHALL be rendered between the name and score cards
- **AND** the layout SHALL collapse as if the element does not exist


<!-- @trace
source: osae-komi-audience-enhance
updated: 2026-03-26
code:
  - .github/prompts/spectra-ingest.prompt.md
  - .github/prompts/spectra-discuss.prompt.md
  - .github/skills/spectra-ask/SKILL.md
  - frontend/src/app/features/fighting-audience/fighting-audience.component.ts
  - .github/prompts/spectra-propose.prompt.md
  - .github/skills/spectra-discuss/SKILL.md
  - .github/prompts/spectra-apply.prompt.md
  - .github/skills/spectra-propose/SKILL.md
  - .github/skills/spectra-apply/SKILL.md
  - frontend/src/app/features/fighting-audience/fighting-audience.component.html
  - .github/skills/spectra-ingest/SKILL.md
  - .spectra.yaml
  - frontend/src/assets/sounds/buzzer-loud.wav
-->

---
### Requirement: OSAE KOMI countdown timer is displayed at enlarged size

The OSAE KOMI countdown timer text SHALL use font size classes `text-6xl md:text-8xl` with `font-black` weight.

The "OSAE KOMI" label text SHALL use font size classes `text-xl md:text-2xl` with `font-black` weight and `tracking-widest` letter spacing.

The container SHALL use `bg-yellow-500/15 border border-yellow-400/50 rounded-xl` styling with `animate-pulse` animation and yellow text color (`text-yellow-300`).

#### Scenario: Timer text is visibly large

- **WHEN** OSAE KOMI is active for a player
- **THEN** the countdown digits SHALL render at `text-6xl` on mobile and `text-8xl` on desktop (md breakpoint)
- **AND** the "OSAE KOMI" label SHALL render at `text-xl` on mobile and `text-2xl` on desktop


<!-- @trace
source: osae-komi-audience-enhance
updated: 2026-03-26
code:
  - .github/prompts/spectra-ingest.prompt.md
  - .github/prompts/spectra-discuss.prompt.md
  - .github/skills/spectra-ask/SKILL.md
  - frontend/src/app/features/fighting-audience/fighting-audience.component.ts
  - .github/prompts/spectra-propose.prompt.md
  - .github/skills/spectra-discuss/SKILL.md
  - .github/prompts/spectra-apply.prompt.md
  - .github/skills/spectra-propose/SKILL.md
  - .github/skills/spectra-apply/SKILL.md
  - frontend/src/app/features/fighting-audience/fighting-audience.component.html
  - .github/skills/spectra-ingest/SKILL.md
  - .spectra.yaml
  - frontend/src/assets/sounds/buzzer-loud.wav
-->

---
### Requirement: OSAE KOMI progress bar with 15 segments

The OSAE KOMI display SHALL include a horizontal progress bar rendered below the countdown timer and label.

The progress bar SHALL consist of exactly 15 rectangular segments displayed in a single horizontal row.

Each segment SHALL represent one second of the 15-second countdown. When the countdown starts at 15 seconds, all 15 segments SHALL be filled (bright yellow, `bg-yellow-400`). Each second, one segment SHALL transition to empty state (`bg-white/10`), from right to left.

The progress bar container SHALL have a minimum width of `min-w-[200px] md:min-w-[280px]` to ensure visibility from a distance.

#### Scenario: Progress bar fully filled at countdown start

- **WHEN** `osae-komi:started` is received with `durationSec: 15`
- **THEN** all 15 segments SHALL be filled with bright yellow color

#### Scenario: Progress bar decreases each second

- **WHEN** the countdown reaches 10 seconds remaining
- **THEN** 10 segments SHALL be filled yellow and 5 segments SHALL be empty (dimmed)

#### Scenario: Progress bar fully empty at countdown end

- **WHEN** the countdown reaches 0 seconds
- **THEN** all 15 segments SHALL be empty (dimmed)

#### Scenario: Progress bar adapts to non-default duration

- **WHEN** `osae-komi:started` is received with a `durationSec` value other than 15
- **THEN** the progress bar SHALL still display 15 fixed segments
- **AND** the number of filled segments SHALL be calculated as `Math.min(15, remainingSeconds)`


<!-- @trace
source: osae-komi-audience-enhance
updated: 2026-03-26
code:
  - .github/prompts/spectra-ingest.prompt.md
  - .github/prompts/spectra-discuss.prompt.md
  - .github/skills/spectra-ask/SKILL.md
  - frontend/src/app/features/fighting-audience/fighting-audience.component.ts
  - .github/prompts/spectra-propose.prompt.md
  - .github/skills/spectra-discuss/SKILL.md
  - .github/prompts/spectra-apply.prompt.md
  - .github/skills/spectra-propose/SKILL.md
  - .github/skills/spectra-apply/SKILL.md
  - frontend/src/app/features/fighting-audience/fighting-audience.component.html
  - .github/skills/spectra-ingest/SKILL.md
  - .spectra.yaml
  - frontend/src/assets/sounds/buzzer-loud.wav
-->

---
### Requirement: OSAE KOMI bell sound plays at maximum volume

When the OSAE KOMI countdown reaches 0, the `bell-short.mp3` audio SHALL be played with `volume` property set to `1.0` (maximum).

#### Scenario: Bell sound at max volume on countdown end

- **WHEN** the OSAE KOMI countdown transitions from 1 to 0
- **THEN** a new `Audio('assets/sounds/bell-short.mp3')` instance SHALL be created with `volume = 1.0`
- **AND** the `play()` method SHALL be called on that instance

<!-- @trace
source: osae-komi-audience-enhance
updated: 2026-03-26
code:
  - .github/prompts/spectra-ingest.prompt.md
  - .github/prompts/spectra-discuss.prompt.md
  - .github/skills/spectra-ask/SKILL.md
  - frontend/src/app/features/fighting-audience/fighting-audience.component.ts
  - .github/prompts/spectra-propose.prompt.md
  - .github/skills/spectra-discuss/SKILL.md
  - .github/prompts/spectra-apply.prompt.md
  - .github/skills/spectra-propose/SKILL.md
  - .github/skills/spectra-apply/SKILL.md
  - frontend/src/app/features/fighting-audience/fighting-audience.component.html
  - .github/skills/spectra-ingest/SKILL.md
  - .spectra.yaml
  - frontend/src/assets/sounds/buzzer-loud.wav
-->

---
### Requirement: Audience display header includes tier label for tournament events

For tournament event teams, the audience display header SHALL render the tier label between the category label and the round/group indicators. The tier label SHALL be the uppercase tier code (e.g., `EL`, `EM`, `EH`, `JH`, `OPEN`, `ELEM`). For sports-day event teams (tier=null), the header SHALL remain unchanged from existing behavior (no tier label rendered).

#### Scenario: Tournament multi-team group header

- **WHEN** audience display loads for a tournament event team with `category: 'male'`, `tier: 'JH'`, in round 1 and group position 2
- **THEN** the header SHALL render exactly `MALE JH R1-G2` with the tier label between category and round-group

#### Scenario: Sports-day header unchanged

- **WHEN** audience display loads for a sports-day event team with `category: 'female'`, `tier: null`, in round 2, group position 1
- **THEN** the header SHALL render exactly `FEMALE R2-G1` (no tier segment), byte-identical to pre-change behavior

##### Example: header rendering variants

| Event type | Category | Tier | Round | Group | Single-team group? | Rendered header |
| ---------- | -------- | ---- | ----- | ----- | ------------------ | --------------- |
| tournament | male | JH | 1 | 2 | no | `MALE JH R1-G2` |
| tournament | female | OPEN | 3 | 1 | no | `FEMALE OPEN R3-G1` |
| tournament | male | EH | 1 | 1 | yes | `MALE EH` |
| tournament | mixed | JH | 2 | 1 | yes | `MIXED JH` |
| sports-day | male | (null) | 1 | 2 | no | `MALE R1-G2` |
| sports-day | female | (null) | 2 | 1 | no | `FEMALE R2-G1` |


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
### Requirement: Ranking table omits unused motion columns based on tier

For tournament event teams whose `tier` is `EL` or `EM`, the audience ranking table SHALL render motion columns only for the motions the tier performs (per the elementary motion-set rules). C series columns SHALL NOT be rendered for EL or EM teams. For `EH` teams, all three series columns SHALL be rendered but only 3 columns per series (A1-A3, B1-B3, C1-C3) instead of the standard 4. For `JH`, `OPEN`, and sports-day teams, existing column rendering SHALL be preserved.

#### Scenario: EL team ranking table

- **WHEN** audience display loads a ranking for an EL team
- **THEN** the visible motion columns SHALL be exactly `A1, B1` plus the existing summary columns; no C series header SHALL be rendered

#### Scenario: Female JH team ranking table shows 3 motions per series

- **WHEN** audience display loads a ranking for a female JH team
- **THEN** the visible motion columns SHALL be exactly `A1, A2, A3, B1, B2, B3, C1, C2, C3` (3 per series), and the system SHALL NOT render `A4`, `B4`, or `C4` columns

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