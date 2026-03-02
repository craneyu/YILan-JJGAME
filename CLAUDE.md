# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**柔術競賽演武計分平台** (Judo Kata Scoring Platform) - A comprehensive online scoring system for traditional judo (kata) competitions.

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
- `action:opened` - Sequence judge opens a motion for scoring
- `score:submitted` - A judge submits their score
- `score:calculated` - All 5 judges submitted, calculated result broadcasted
- `wrong-attack:updated` - VR judge marks/unmarks a motion as wrong attack (no score)
- `vr:submitted` - VR judge submits diversity scores (throw & ground variety per series)
- `group:changed` - Switch to next team (carries `nextTeamId`, `round`)
- `round:changed` - Move to next round (series A→B→C)
- `team:abstained` - Sequence judge marks team as abstained (skip VR scoring)
- `team:abstain-cancelled` - Cancel abstention, re-enable VR scoring

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

## Codebase Structure (Planned)

```
Yilan-jju/
├── SPEC/
│   └── SPEC.md                    # Complete system specification
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layouts/           # (computed, vr, sequence, audience)
│   │   │   ├── services/          # Socket.IO, API, State Management (Signal)
│   │   │   └── shared/            # Shared components (buttons, cards, etc.)
│   │   ├── styles.css             # Tailwind 4.x with @theme
│   │   └── main.ts
│   ├── angular.json
│   ├── tailwind.config.ts         # (if needed, else use @theme in CSS)
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/                # Express routes (events, teams, scores, flow)
│   │   ├── controllers/           # Business logic
│   │   ├── models/                # Mongoose schemas (Event, Team, Score, VRScore)
│   │   ├── middleware/            # JWT auth, error handling
│   │   ├── sockets/               # Socket.IO event handlers
│   │   └── index.ts               # Express + Socket.IO server
│   ├── .env
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
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
- **JWT Roles**: 5 roles enforce permissions (scoring_judge, vr_judge, sequence_judge, admin, audience)
  - No token expiration (LAN-only, logout = close browser)
- **Socket.IO Broadcasting**: Join event room on connect, broadcast to all clients in `eventId`
- **Score Calculation**: Middleware processes dropped high/low scores server-side

### Database
- **Collections**: events, teams, scores, vr_scores, users
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

### Adding a New Scoring Judge Role Feature
1. Create new Standalone component in `frontend/src/app/layouts/scoring-judge-v2/`
2. Inject `EventService` and `SocketService` to listen for `action:opened`, `group:changed`
3. Use Signal to track current motion, judge selections, submission state
4. POST to `/api/v1/scores` on confirm, listen for `score:calculated` broadcast
5. Backend: Extend `POST /scores` controller to handle new logic, emit recalculated event

### Running a Single Judge Test Session
1. Start Docker Compose: `docker compose up`
2. Open 7 browser tabs (5 scoring judges, 1 VR, 1 sequence, 1 audience) to `http://localhost:4200`
3. Login as different roles (roles selected via UI form)
4. Sequence judge opens motion → scoring judges enable → submit → real-time sync
5. Check audience panel updates without refresh

### Debugging Socket.IO Events
1. Backend: Add `console.log()` in socket handlers (`src/sockets/scoreHandler.ts`)
2. Frontend: Use `SocketService.debug$` or browser DevTools console
3. Verify event payloads in Network tab (WS frames)
4. Check MongoDB via `mongosh` to confirm persistence

## Integration Notes

### API Endpoints
- **Event Management**: `GET/POST /api/v1/events`, `PATCH /api/v1/events/:id`, `DELETE /api/v1/events/:id`
- **Teams**: `GET/POST /api/v1/events/:id/teams`, `PATCH /api/v1/events/:id/teams/:teamId`
- **Scores**: `POST /api/v1/scores`, `GET /api/v1/events/:id/scores`, `GET /api/v1/scores/my-round`, `GET /api/v1/scores/mine`
- **VR Scores**: `POST /api/v1/vr-scores` (per series: throwVariety, groundVariety)
- **Wrong Attacks**: `POST /api/v1/wrong-attacks` (toggle mark on completed motion)
- **Rankings**: `GET /api/v1/events/:id/rankings` (includes actionDetails per motion, vrDetails per series per team)
- **Flow Control**: `POST /api/v1/flow/open-action`, `POST /api/v1/flow/next-group`, `POST /api/v1/flow/abstain`
- All authenticated endpoints require `Authorization: Bearer <JWT>`

### Environment & Secrets
- **Backend** `.env`: `MONGO_URI`, `JWT_SECRET`, `NODE_ENV`
- **Frontend**: No secrets (audience-facing, all auth via JWT in HTTP header)
- Development: Use `.env.local` (git-ignored)

### Teams Import (Admin Feature)
- **Format**: `Team Name, Member 1, Member 2, Category` (e.g., "Red Team, 張三, 李四, male")
- **Validation**: Check duplicate member names per event, report conflicts with SweetAlert2
- **Implementation**: Use `papaparse` for CSV, upload via file input, POST to bulk teams endpoint

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

### ✅ Completed
- **Phase 1**: Core scoring (3 rounds, 5 judges, audience display)
- **Phase 2**: Admin import (Excel/CSV), team management, round/group configuration
- **Phase 3**: VR judge diversity scoring (per series), wrong attack marking
- **Result Export**: Per-category Excel (detailed PART scores) & PDF (printable + signature)
- **UI Enhancements**: Fullscreen mode (audience, judges), category labels (MALE/FEMALE/MIXED), per-category rankings
- **Deployment**: Docker Compose (dev) + Portable package (MacBook/offline deployment)

### 🔮 Future Enhancements
- **Phase 4**: Tournament mode (bracket, finals, live leaderboard)
- **Video Markup**: Replay with judge notes/timestamps
- **Mobile Judge Interface**: Tablet-optimized scoring layouts
- **Advanced Analytics**: Team performance trends, judge consistency analysis

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
