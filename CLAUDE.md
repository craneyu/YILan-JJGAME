<!-- SPECTRA:START v1.0.1 -->

# Spectra Instructions

This project uses Spectra for Spec-Driven Development(SDD). Specs live in `openspec/specs/`, change proposals in `openspec/changes/`.

## Use `/spectra:*` skills when:

- A discussion needs structure before coding → `/spectra:discuss`
- User wants to plan, propose, or design a change → `/spectra:propose`
- Tasks are ready to implement → `/spectra:apply`
- There's an in-progress change to continue → `/spectra:ingest`
- User asks about specs or how something works → `/spectra:ask`
- Implementation is done → `/spectra:archive`

## Workflow

discuss? → propose → apply ⇄ ingest → archive

- `discuss` is optional — skip if requirements are clear
- Requirements change mid-work? Plan mode → `ingest` → resume `apply`

## Parked Changes

Changes can be parked（暫存）— temporarily moved out of `openspec/changes/`. Parked changes won't appear in `spectra list` but can be found with `spectra list --parked`. To restore: `spectra unpark <name>`. The `/spectra:apply` and `/spectra:ingest` skills handle parked changes automatically.

<!-- SPECTRA:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**柔術競賽線上即時計分平台** (Judo Competition Online Scoring Platform) - A comprehensive real-time scoring system for judo competitions supporting multiple sport types: Duo kata (雙人演武), Creative kata (創意演武), Fighting (對打), Ne-Waza (寢技), and Contact (格鬥).

See `SPEC/SPEC.md` for the complete system specification.

## Architecture Summary

### System Stack
- **Frontend**: Angular 20 (Standalone components), Tailwind CSS 4.x, Font Awesome 7, SweetAlert2
- **Backend**: Node.js 22 + Express 5, Socket.IO 4 for real-time updates, JWT authentication
- **Database**: MongoDB 7, Mongoose 8 ODM
- **Deployment**: Docker Compose with three services (frontend, backend, mongo)

### Data Flow
1. Judges submit scores via REST API → Backend processes and broadcasts via Socket.IO
2. All clients in the event room receive real-time updates
3. Scoring algorithm: Drop highest/lowest score from 5 judges, sum middle 3 (max 9 points per item)
4. MongoDB stores events, teams, scores, VR scores with full score history

### Key Real-time Events (Socket.IO)

**Kata (Duo) Events:**
- `action:opened` - Sequence judge opens a motion for scoring
- `score:submitted` / `score:calculated` - Judge score submission & calculation
- `wrong-attack:updated` - VR judge marks/unmarks wrong attack
- `vr:submitted` - VR diversity scores
- `group:changed` / `round:changed` - Flow control
- `team:abstained` / `team:abstain-cancelled` - Abstention

**Creative Kata Events:**
- `creative:scoring-opened` / `creative-score:submitted` / `creative-score:calculated`
- `creative:team-changed` / `creative:team-abstained` / `creative:team-abstain-cancelled`
- `timer:started` / `timer:stopped` / `penalty:updated`

**Match (Fighting/Ne-Waza/Contact) Events:**
- `match:started` / `match:ended` / `match:score-updated` / `match:timer-updated`
- `match:foul-updated` / `match:full-ippon` / `match:shido-dq`
- `match:winner-preview` / `match:winner-preview-cancelled` / `match:scores-reset`
- `osae-komi:started` / `osae-komi:ended` / `injury:started` / `injury:ended`
- `contact:foul-updated` / `contact:knockdown-updated` / `contact:golden-minute`
- `contact:winner` / `contact:cancel-winner` / `contact:reset`

## Development Commands

### Project Setup

```bash
# Install dependencies
cd frontend && npm install
cd ../backend && npm install

# Set up environment files
# backend/.env should contain:
# MONGO_URI=mongodb://localhost:27017/jju
# JWT_SECRET=your_secret_key
```

### Running Services

```bash
# Option 1: Docker Compose (development)
docker compose up --build

# Option 2: Docker Portable Package (deployment - MacBook/offline)
tar -xzf jju-docker.tar.gz
cd jju-package
./start.sh  # Auto-loads images, starts services, preserves data

# Option 3: Manual startup (development without Docker)
# Terminal 1: MongoDB
mongod --dbpath ./data

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Frontend
cd frontend && npm start
```

**Portable Package Notes**:
- Pre-built images: frontend, backend, MongoDB 7
- One-command deployment: `./start.sh`
- Volume persistence: MongoDB data survives container restarts/image updates
- No internet required: All images embedded in tar.gz
- Fresh rebuild each time (updates app code, preserves DB)

### Testing & Validation

```bash
# Frontend unit tests
cd frontend && npm test

# Backend unit tests
cd backend && npm test

# Run single test file
npm test -- --include="**/path/to/spec.ts"

# E2E tests (if implemented)
cd frontend && npm run e2e
```

### Linting & Code Quality

```bash
# Frontend linting
cd frontend && npm run lint
npm run lint:fix

# Backend linting (if ESLint configured)
cd backend && npm run lint
```

### Build for Production

```bash
# Frontend production build
cd frontend && npm run build

# Backend uses Node directly (no build step needed)

# Or use Docker Compose
docker compose up --build -d
```

## Codebase Structure

```
Yilan-jju/
├── SPEC/
│   └── SPEC.md                    # Complete system specification
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── features/          # Feature components (see below)
│   │   │   │   ├── admin/         # Admin dashboard + sub-components
│   │   │   │   ├── login/
│   │   │   │   ├── scoring-judge/ / vr-judge/ / sequence-judge/
│   │   │   │   ├── audience/ / audience-sport-selector/
│   │   │   │   ├── creative-scoring-judge/ / creative-sequence-judge/ / creative-audience/
│   │   │   │   ├── fighting-referee/ / fighting-audience/
│   │   │   │   ├── ne-waza-referee/ / ne-waza-audience/
│   │   │   │   ├── contact-referee/ / contact-audience/
│   │   │   │   ├── referee-landing/ / match-audience/
│   │   │   │   └── match-management/ / judge-management/
│   │   │   ├── core/
│   │   │   │   ├── services/      # ApiService, AuthService, SocketService
│   │   │   │   ├── guards/        # Role-based route guards
│   │   │   │   ├── interceptors/  # JWT auth interceptor
│   │   │   │   ├── models/        # TypeScript interfaces (match.model.ts)
│   │   │   │   └── utils/         # match-grouping.ts
│   │   │   ├── app.routes.ts      # All route definitions with lazy loading
│   │   │   └── app.config.ts      # Angular providers
│   │   ├── styles.css             # Tailwind 4.x with @theme + glassmorphism utilities
│   │   └── main.ts
│   ├── angular.json
│   ├── postcss.config.json        # @tailwindcss/postcss (JSON format, not .js)
│   ├── proxy.conf.json            # Dev proxy → localhost:3000
│   ├── Dockerfile
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/                # 14 route files (auth, events, teams, scores, flow, matches, etc.)
│   │   ├── controllers/           # 19 controller files
│   │   ├── models/                # 12 Mongoose models (User, Event, Team, Score, VRScore,
│   │   │                          #   Match, MatchScoreLog, GameState, WrongAttack,
│   │   │                          #   CreativeScore, CreativePenalty, CreativeGameState)
│   │   ├── middleware/            # auth.ts (JWT + role), errorHandler.ts
│   │   ├── sockets/               # Socket.IO broadcast handlers
│   │   ├── seeds/                 # initialUsers.ts, migrateEventTypes.ts
│   │   ├── utils/                 # scoring.ts, creativeScoring.ts, teamSort.ts
│   │   └── index.ts               # Express + Socket.IO server entry
│   ├── .env.example
│   ├── package.json
│   └── Dockerfile
├── openspec/                      # Spectra SDD specs & archived changes
├── docker-compose.yml
├── package-docker.sh              # MacBook offline portable package script
├── package-synology.sh            # Synology NAS deployment script
└── CLAUDE.md                      # This file
```

## Key Design Patterns

### Frontend
- **Standalone Components**: No NgModule, each component self-contained with imports
- **Angular Signals**: State management using `Signal<T>`, `computed()`, `effect()`
- **Real-time Binding**: Socket.IO updates trigger Signal changes, UI auto-updates
- **Glassmorphism UI**:
  - `backdrop-blur-md`, `bg-white/10~20`, `border-white/30`, `rounded-2xl`
  - Active state: `bg-blue-500/80`, buttons use `backdrop-blur-sm`
  - Disabled: `bg-white/10 text-white/30 cursor-not-allowed`

### Backend
- **RESTful API**: All endpoints under `/api/v1` prefix
- **JWT Roles**: 6 roles enforce permissions (scoring_judge, vr_judge, sequence_judge, match_referee, admin, audience)
  - No token expiration (LAN-only, logout = close browser)
- **Socket.IO Broadcasting**: Join event room on connect, broadcast to all clients in `eventId`
- **Score Calculation**: Utils process dropped high/low scores server-side

### Database
- **Collections**: users, events, teams, scores, vr_scores, wrong_attacks, game_states, matches, match_score_logs, creative_scores, creative_penalties, creative_game_states
- **Indexes**: Ensure unique player names per event, eventId/teamId for filtering
- **Persistence**: MongoDB volume `mongo_data` persists across container rebuilds

## Scoring Algorithm

### Per-Item Calculation
Each scoring item (e.g., P1 "Stance & Technique"):
1. Collect 5 judge scores: e.g., [3, 3, 2, 2, 1]
2. Drop max (3) and min (1)
3. Sum middle 3: 3 + 2 + 2 = **7 points** (max 9)

### Motion Total
- A/B Series: 4 items × 9 max = 36 points
- C Series: 5 items × 9 max = 45 points

### Wrong Attack Handling
- VR Judge can mark a completed motion as "wrong attack" (無效動作)
- Wrong attack motions receive **zero score** (not included in rankings)
- Marked motions show red warning label on audience display
- Impact: Team's total score & ranking recalculated without marked motions

### VR Diversity Scoring (Per Series)
After all motions in a series complete, VR Judge evaluates:
- **摔技多樣性** (Throw variety): 0, 1, or 2 points
- **地板技多樣性** (Ground technique variety): 0, 1, or 2 points
- **Max per series**: 4 points (2 + 2)
- Tracked separately per series: VR_A, VR_B, VR_C in rankings

### Creative Kata Scoring
Each of 5 judges submits technical (0–9.5) and artistic (0–9.5) scores:
1. Drop highest and lowest for both technical & artistic
2. Sum middle 3 judges
3. Apply penalty deductions (overtime, undertime, props, attacks)
4. Final = max(0, technicalTotal + artisticTotal - penalties)

## Critical UI States

### Scoring Judge Interface
- **Header**: Category + Round-Group label (e.g., `FEMALE R1-G2`), Fullscreen toggle
1. **Waiting** (locked): "等待賽序裁判開放評分" + show motion history of completed actions in current series
2. **Scoring** (unlocked):
   - Buttons 3/2/1/0 per item (4 items for A/B, 5 items for C series)
   - "確認送出" disabled until all items filled
   - Show action card image below scoring area (if available)
3. **Submitted** (read-only): Display submitted scores, show "等待賽序裁判開放下一動作"
4. State transitions triggered by Sequence Judge "開放評分" (via Socket.IO `action:opened` event)
5. **Fullscreen mode**: Hide browser UI for dedicated judge station display

### Audience Display
- **Header**: Event name + Category label & Round-Group (e.g., `MALE R2-G1` = Male category, Round 2, Group 1 within male category)
  - **Category labels**: `MALE` (男子組), `FEMALE` (女子組), `MIXED` (混合組)
  - **G (Group) resets per round**: G counts position within each category (not global team index)
- **Fullscreen mode**: Button to hide browser UI (address bar, tabs, toolbars) for maximum display area
- **Total Score**: Large display showing current team's cumulative total + completed motions count
- **Category Ranking**: Shows team's rank within their category (e.g., "2nd / 5 teams")
- **Score Table**: Motion columns (A1~A4 or B1~B4 or C1~C5), plus VRT (VR total per series) and TOT (series total)
  - **Wrong Attack indicator**: Red warning label on motions marked as wrong attack (zero score)
  - **VR scores split by series**: VR diversity scores shown separately for A/B/C series
- **Judge Row**: P1~P4 (or P1~P5 for C series) showing current motion's judge totals (middle 3 of 5)
- **Unscored**: Shown as `-`, updates real-time once all 5 judges submit

## Common Development Tasks

### Adding a New Feature Component
1. Create new Standalone component in `frontend/src/app/features/<feature-name>/`
2. Inject `ApiService` and `SocketService` for data and real-time events
3. Use Angular Signals to track state, `computed()` for derived values
4. Add route in `app.routes.ts` with appropriate `roleGuard()`
5. Backend: Add route file in `routes/`, controller in `controllers/`, register in `index.ts`

### Running a Kata Judge Test Session
1. Start services: `docker compose up` or manual startup
2. Open browser tabs to `http://localhost:4200`:
   - 5 scoring judges (`judge1`–`judge5`), 1 VR (`vr`), 1 sequence (`seq`), 1 audience (`audience`)
3. Each user logs in → selects event → enters respective interface
4. Sequence judge opens motion → scoring judges score → real-time sync to audience

### Running a Match (Fighting/Ne-Waza/Contact) Test Session
1. Start services, open browser tabs:
   - 1 match referee (`match1`), 1 audience
2. Admin creates matches in management panel
3. Referee controls timer, scores, fouls; audience sees real-time updates

### Debugging Socket.IO Events
1. Backend: Add `console.log()` in socket handlers (`src/sockets/index.ts`)
2. Frontend: Check browser DevTools console or Network tab (WS frames)
3. Check MongoDB via `mongosh` to confirm persistence

## Integration Notes

### API Endpoints

**Auth**: `POST /api/v1/auth/login`, `/register`, `/register-initial`, `/select-event`, `GET /users`, `PATCH /users/:userId/*`, `DELETE /users/:userId`

**Events**: `GET/POST /api/v1/events`, `PATCH/DELETE /api/v1/events/:id`, `GET /events/:id/rankings`, `GET /events/:id/creative-rankings`, `GET /events/:id/summary`, `DELETE /events/:id/scores`

**Teams**: `GET/POST /api/v1/events/:id/teams`, `POST /teams/import`, `POST /teams/batch-delete`, `POST /teams/batch-order`, `PATCH/DELETE /teams/:teamId`

**Kata Scoring**: `POST /api/v1/scores`, `GET /scores/mine`, `GET /scores/my-round`
**VR Scores**: `POST /api/v1/vr-scores`
**Wrong Attacks**: `POST/GET /api/v1/wrong-attacks`
**Kata Flow**: `POST /api/v1/flow/open-action`, `/next-group`, `/abstain`, `/cancel-abstain`, `GET /flow/state/:eventId`

**Creative Scoring**: `POST/GET /api/v1/creative-scores`
**Creative Flow**: `POST /api/v1/creative/flow/open-scoring`, `/confirm-scores`, `/next-team`, `/start-timer`, `/stop-timer`, `/pause-timer`, `/resume-timer`, `/reset-timer`, `/abstain`, `/abstain-cancel`
**Creative Penalties**: `POST/GET /api/v1/creative/penalties`

**Matches**: `GET/POST /api/v1/events/:id/matches`, `POST /matches/bulk`, `PATCH/DELETE /matches/:matchId`, `PATCH /matches/batch-reset`
**Match Scores**: `POST /api/v1/match-scores`, `/reset`, `/part`, `/foul`, `PATCH /duration`, `/timer-adjust`
**Contact**: `PATCH /api/v1/contact/action`, `/winner`, `/cancel-winner`

**Backup**: `GET /api/v1/backup`

All authenticated endpoints require `Authorization: Bearer <JWT>`

### Environment & Secrets
- **Backend** `.env`: `MONGO_URI`, `JWT_SECRET`, `NODE_ENV`
- **Frontend**: No secrets (audience-facing, all auth via JWT in HTTP header)
- Development: Use `.env.local` (git-ignored)

### Teams Import (Admin Feature)
- **Format**: Excel (.xlsx) or CSV with columns: 隊伍名稱/team, 隊員一/member1, 隊員二/member2, 組別/category
- **Validation**: Check duplicate member names per event, report conflicts with SweetAlert2
- **Implementation**: Backend uses `xlsx` + `csv-parser` for parsing, `multer` for file upload

### Results Export (Admin Feature - Post-Event)
- **Per-category Excel (.xlsx)**: Each category gets separate file with:
  - Team rank, name, members, total score
  - Per-motion detailed scores (P1–P5 breakdown + motion subtotal)
  - VR scores breakdown (throwVariety, groundVariety per series: A/B/C)
  - Series subtotals and grand total
  - Uses `XLSX` library with merged cells for readability
- **Per-category PDF**: Printable/signable format with:
  - All teams in category with rankings
  - Per-team score summary (VR combined, not split)
  - Chief judge signature area at bottom
  - A4 landscape orientation, one page per category
- Both export buttons placed on each category card in admin rankings view

## Current Feature Status

### Completed
- **Kata Duo**: 5-judge scoring, VR diversity, wrong attack, abstention, 3 rounds (A/B/C), audience display
- **Creative Kata**: Independent scoring pipeline, timer, penalties, abstention
- **Fighting**: IPPON/WAZA-ARI/SHIDO/CHUI scoring, timer, FULL IPPON trigger, winner preview
- **Ne-Waza**: OSAE-KOMI hold-down timer (with progress bar + buzzer), injury timer, scoring
- **Contact**: Card-based scoring, knockdowns, golden minute, fouls, winner declaration
- **Admin**: Event/team/match management, Excel/CSV import, batch operations, judge account management
- **Result Export**: Per-category Excel (detailed PART scores) & PDF (printable + signature)
- **UI**: Glassmorphism design, fullscreen mode, per-category rankings, sport selector
- **Deployment**: Docker Compose, MacBook portable package, Synology NAS deployment
- **Database Backup**: Admin can download full DB backup

## Important Implementation Notes

### Tailwind CSS 4.x Integration
- Uses **`@theme` block in `styles.css`**, NOT `tailwind.config.js`
- All components are **Standalone** with individual imports
- Glassmorphism design: `backdrop-blur-md`, `bg-white/10~20`, `border-white/30`, `rounded-2xl`

### Group Index Calculation
- **Per-category tracking**: G (group number) counts position **within the same category**, not globally
- Example: If male teams: M1, M2, M3 and female teams: F1, F2
  - Male teams display as: G1, G2, G3
  - Female teams display as: G1, G2
- **Reset on round change**: When `round:changed` fires, all categories reset to G=1
- Implemented via filtering teams by category before finding index: `teams.filter(t => t.category === currentTeam.category).findIndex(...)`

### Wrong Attack vs Abstention
- **Wrong Attack** (VR Judge action): Individual motion marked as invalid, zero score, but team continues
- **Abstention** (Sequence Judge action): Entire team skips VR scoring, no diversity points
- Both affect final rankings; abstained teams show red "棄權" label on audience
