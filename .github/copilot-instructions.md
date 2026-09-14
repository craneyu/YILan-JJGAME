# Copilot Instructions - Yilan JJU Scoring Platform

**柔術競賽線上即時計分平台** - Real-time scoring system for judo competitions supporting Duo kata (雙人演武), Creative kata (創意演武), Fighting (對打), Ne-Waza (寢技), and Contact (格鬥).

## Build, Test, and Lint Commands

### Frontend (`frontend/`)
```bash
# Development server (listens on all interfaces: 0.0.0.0:4200)
npm start

# Production build
npm run build

# Testing
npm test                    # Run all tests
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Run tests with coverage report

# Linting
npm run lint
```

### Backend (`backend/`)
```bash
# Development server with auto-reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production server
npm start

# Testing
npm test                    # Run all tests
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Run tests with coverage report

# Initialize database with default users
npm run seed
```

### Docker
```bash
# Start all services (frontend, backend, MongoDB)
docker compose up --build

# Start in detached mode
docker compose up --build -d
```

## Architecture Overview

### Tech Stack
- **Frontend**: Angular 20 (Standalone components), Tailwind CSS 4.x, Socket.IO client
- **Backend**: Node.js 22 + Express 5, Socket.IO 4, JWT auth, Mongoose 8
- **Database**: MongoDB 7

### Data Flow
1. **User Action** → Frontend sends HTTP request to `/api/v1/*` endpoints
2. **Backend Processing** → Controller validates, updates MongoDB, broadcasts via Socket.IO
3. **Real-time Sync** → All clients in the event room receive Socket.IO event
4. **UI Update** → Angular Signals trigger automatic re-renders

### Key Real-time Events (Socket.IO)

**Kata (Duo) Events:**
- `action:opened` - Sequence judge opens a motion for scoring
- `score:submitted` / `score:calculated` - Judge score submission & calculation
- `wrong-attack:updated` - VR judge marks/unmarks wrong attack
- `vr:submitted` - VR diversity scores
- `group:changed` / `round:changed` - Flow control
- `team:abstained` / `team:abstain-cancelled` - Abstention (per team **per round**)

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

## Codebase Conventions

### Frontend

#### Component Architecture
- **All components are Standalone** - No NgModules. Each component imports its own dependencies.
- **Angular Signals for state** - Use `Signal<T>`, `computed()`, `effect()` for reactive state management.
- **Inject services with `inject()`** - ApiService, SocketService, AuthService, Router.
  Constructor parameter injection is not used in this codebase.
- **SocketService exposes Observables, not callbacks** - there is no `socket.on(...)`.
  Each event is an `xxx$` getter (e.g. `scoreCalculated$`, `teamAbstained$`); subscribe and
  collect the subscriptions so `ngOnDestroy` can unsubscribe.

Example component structure:
```typescript
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SocketService } from '../../core/services/socket.service';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './example.component.html'
})
export class ExampleComponent implements OnInit, OnDestroy {
  private socket = inject(SocketService);
  private subs = new Subscription();

  currentScore = signal<number>(0);
  displayScore = computed(() => `Score: ${this.currentScore()}`);

  ngOnInit(): void {
    this.subs.add(
      this.socket.scoreCalculated$.subscribe((e) => this.currentScore.set(e.actionTotal)),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
```

#### Styling with Tailwind CSS 4.x
- **Configuration in `styles.css`** - Uses `@theme` block, NOT `tailwind.config.js`
- **Glassmorphism design system** - Predefined utility classes:
  - `.glass-card` - Base glass card (backdrop-blur-md, bg-white/10, border-white/30)
  - `.glass-btn` - Glass button
  - `.primary-btn` - Primary action button (bg-blue-500/80)
  - `.disabled-btn` - Disabled state (bg-white/10, text-white/30, cursor-not-allowed)
- **Active/Selected states** - Use `bg-blue-500/80` for active items
- **Disabled states** - Use `bg-white/10 text-white/30 cursor-not-allowed`

#### Routing & Guards
- All routes defined in `app.routes.ts` with lazy loading
- Role-based route guards: `roleGuard('admin', 'scoring_judge')` — it takes **rest parameters**, not an array
- Available roles: `scoring_judge`, `vr_judge`, `sequence_judge`, `match_referee`, `admin`, `audience`,
  `check_in_officer`

### Backend

#### API Structure
- **All endpoints under `/api/v1` prefix**
- **JWT authentication** - Required for all non-public endpoints (no expiration, LAN-only)
- **Role-based access control** - Middleware checks `req.user.role`
- **Socket.IO room pattern** - Clients join room by `eventId`, broadcasts target specific events

#### Model Naming
- MongoDB collections: users, events, teams, scores, vr_scores, wrong_attacks, abstentions, game_states, matches, match_score_logs, creative_scores, creative_penalties, creative_game_states
- Mongoose models use singular PascalCase: User, Event, Team, Score, etc.

#### Route File Pattern
Each route file exports an Express Router:
```typescript
// routes/scores.ts
import { Router } from 'express';
import { submitScore, getMyScores } from '../controllers/scoreController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();
router.post('/', verifyToken, requireRole('scoring_judge'), submitScore);
router.get('/mine', verifyToken, getMyScores);

export default router;
```

`middleware/auth.ts` exports `verifyToken` (401 without a valid token), `requireRole(...roles)`
(403 on mismatch), and `optionalAuth` (fills `req.user` when a token is present, never rejects —
used by public endpoints that return extra fields to admins).

Register in `src/index.ts`:
```typescript
import scoreRoutes from './routes/scores';
app.use('/api/v1/scores', scoreRoutes);
```

#### Socket.IO Broadcasting
- Pattern: `io.to(eventId).emit('event:name', data)`
- All socket handlers in `src/sockets/index.ts`
- Clients join room on connect: `socket.join(eventId)`

### Scoring Algorithm

**Per-item calculation** (e.g., P1 "Stance & Technique"):
1. Collect 5 judge scores: `[3, 3, 2, 2, 1]`
2. Drop max (3) and min (1)
3. Sum middle 3: `3 + 2 + 2 = 7 points` (max 9)

**Motion total:**
- A/B Series: 4 items × 9 max = 36 points
- C Series: 5 items × 9 max = 45 points

**Wrong Attack handling:**
- VR Judge can mark motions as "wrong attack" (無效動作)
- Marked motions receive zero score (excluded from rankings)
- Implemented in `backend/src/utils/scoring.ts`

**Creative Kata:**
- Technical (0–9.5) + Artistic (0–9.5) scores from 5 judges
- Drop highest/lowest for both, sum middle 3
- Apply penalties (overtime, undertime, props, attacks)
- Final = `max(0, technicalTotal + artisticTotal - penalties)`

### Important Implementation Notes

#### Group Index Calculation (G number)
- **Per-category tracking**: G counts position **within the same category**, not globally
- Example: Male teams M1, M2, M3 → G1, G2, G3; Female teams F1, F2 → G1, G2
- **Reset on round change**: When `round:changed` fires, all categories reset to G=1
- Implementation: `teams.filter(t => t.category === currentTeam.category).findIndex(...)`

#### Wrong Attack vs Abstention
- **Wrong Attack** (VR Judge): Individual motion marked invalid, zero score, team continues
- **Abstention** (Sequence Judge): Skips the VR check for **that team in that round** — it is per-round,
  not a withdrawal from the event. Stored per `(eventId, teamId, round)` in the `abstentions` collection.
  `GameState.currentTeamAbstained` is only the live flag for the current team and is not reset by
  `open-action`, so never derive per-team abstention from it.
- `GET /events/:id/rankings` returns `abstainedRounds`; the audience shows a red 「棄權」 badge and all
  three kata exports annotate it. Abstention does not remove a kata team from the rankings.

#### Teams Import/Export
- **Import format**: Excel (.xlsx) or CSV with columns: 隊伍名稱/team, 隊員一/member1, 隊員二/member2, 組別/category
- **Validation**: Check duplicate member names per event
- **Export**: Per-category Excel (detailed scores) & PDF (printable with signature area)
- Backend uses `xlsx` + `csv-parser` for parsing, `multer` for file upload

## Testing Patterns

### Frontend Unit Tests (Jest)
- Test files: `*.spec.ts` alongside components
- Mock Socket.IO: `jest.mock('socket.io-client')`
- Mock Angular services: Use `TestBed.configureTestingModule`

### Backend Unit Tests (Jest)
- Test files: `*.test.ts` under `__tests__/` (some older ones sit in `__test__/`)
- Use `mongodb-memory-server` for isolated DB tests
- Mock middleware: `jest.fn()` for auth, errorHandler

## Common Development Workflows

### Adding a New Feature Component
1. Create Standalone component: `ng generate component features/my-feature` (standalone is the default in Angular 20)
2. Inject services: `ApiService`, `SocketService`
3. Use Signals for state tracking
4. Add route in `app.routes.ts` with `roleGuard()`
5. Backend: Create route file, controller, register in `index.ts`

### Adding a New Socket Event
1. **Backend**: Add broadcast in controller
   ```typescript
   io.to(eventId).emit('my-event:updated', data);
   ```
2. **Frontend**: add an `xxx$` getter in `core/services/socket.service.ts`
   ```typescript
   get myEventUpdated$(): Observable<MyEventUpdatedEvent> {
     return fromEvent<MyEventUpdatedEvent>(this.socket, 'my-event:updated');
   }
   ```
   then subscribe in the component
   ```typescript
   this.subs.add(
     this.socket.myEventUpdated$.subscribe((data) => this.myState.set(data)),
   );
   ```

### Debugging Real-time Sync
1. **Backend logs**: Add `console.log()` in socket handlers (`src/sockets/index.ts`)
2. **Frontend**: Check DevTools → Network → WS (WebSocket frames)
3. **Database**: Use `mongosh` to verify persistence
4. **Event flow**: Login → Select event → Join room → Listen for events

## Environment Configuration

### Backend `.env`
```env
MONGO_URI=mongodb://localhost:27017/jju
JWT_SECRET=your_secret_key
NODE_ENV=development
PORT=3000
```

### Frontend Development
- Dev server proxies `/api` to `localhost:3000` (see `proxy.conf.json`)
- No environment secrets (all auth via JWT in HTTP header)

## Deployment

### Docker Compose
- Three services: frontend (nginx), backend (node), mongo
- MongoDB volume `mongo_data` persists across rebuilds

### Portable Package (Offline)
```bash
# MacBook offline package
./package-docker.sh

# Synology NAS deployment
./package-synology.sh
```

## Reference Documentation

- **Complete specification**: `SPEC/SPEC.md`
- **Spectra SDD specs**: `openspec/specs/`
- **Archived changes**: `openspec/changes/archive/`
- **Claude instructions**: `CLAUDE.md` (comprehensive technical guide)
- **README**: `README.md` (quick start, API overview)
