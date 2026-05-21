## MODIFIED Requirements

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
