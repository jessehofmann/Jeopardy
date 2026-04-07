# Jeopardy Game

A real-time multiplayer Jeopardy-style game with a big-screen board display, a host console, and per-player buzzer controllers — all synchronized over WebSockets.

## Structure

| Folder | Purpose |
|--------|---------|
| `web/` | Big-screen board display (React + Vite, port 3000) |
| `mobile/` | Host console + player buzzer app (React + Vite, port 3001) |
| `server/` | Node.js WebSocket room server (port 8080) |
| `shared/` | Shared TypeScript types and clue catalog consumed by both frontends |

## How It Works

1. The **web board** connects to the server and displays the room code.
2. A **host** joins that room from the mobile app and gets full game controls.
3. **Players** join the same room from their phones and use the buzzer interface.
4. The **server** is the single source of truth — every action triggers a full `RoomState` broadcast to all clients in the room.

## Running the Project

From the repository root:

```bash
npm install
npm run start:all
```

This starts all three services concurrently:

- **Web board** → `http://localhost:3000`
- **Mobile companion** → `http://localhost:3001`
- **WebSocket server** → `ws://localhost:8080`

Both Vite apps proxy `/ws` to the WebSocket server during local development.

## Other Scripts

```bash
npm run start:web        # Web board only
npm run start:companion  # Mobile companion only
npm run start:server     # WebSocket server only
npm run start:clients    # Web + companion (no server)
npm run build:web        # Production build for web board
npm run build:companion  # Production build for mobile companion
npm test                 # Server unit/integration tests
```

## Gameplay Flow

### Rounds 1 & 2
- Board displays 6 categories × 5 clues each
- Host selects clues from their phone; the board animates the clue open
- Host reads the clue aloud, then manually opens buzzers
- First player to buzz in gets 5 seconds to answer
- Host marks correct (score +clue value, player gets board control) or incorrect (player locked out, buzzers reopen for others)
- Round 1 uses values $200–$1000; Round 2 uses $400–$2000

### Daily Double
- One hidden Daily Double per round (two in Round 2 on real Jeopardy — server assigns randomly)
- Board owner enters a wager before the clue is revealed
- Only the board owner answers; buzzers do not open

### Final Jeopardy
- Phase transitions: `playing` → `final-category` → `final-question` → `final-reveal` → `game-over`
- Players wager on their phones during the category reveal
- 30-second answer timer is server-authoritative (all clients sync to the same deadline timestamp)
- Host reveals and judges each player's answer individually
- Final leaderboard ranks all players with correct ordinals (1st, 2nd, 3rd, 4th…)

## Custom Boards

The host can load a custom JSON board via the "Custom Board" button in the host console. Format:

```json
{
  "name": "My Custom Show",
  "round1": [
    {
      "name": "CATEGORY NAME",
      "clues": [
        { "value": 200, "question": "The clue read aloud", "answer": "What is X" },
        { "value": 400, "question": "...", "answer": "..." },
        { "value": 600, "question": "...", "answer": "..." },
        { "value": 800, "question": "...", "answer": "..." },
        { "value": 1000, "question": "...", "answer": "..." }
      ]
    }
  ],
  "round2": [ ... ],
  "finalJeopardy": {
    "category": "Category Name",
    "question": "The final clue",
    "answer": "What is the answer"
  }
}
```

## Notable Details

- **Clue deduplication**: played clue IDs are stored in `localStorage` and excluded from future board seeds so the same clues don't repeat across sessions.
- **Room state is in-memory only** — restarting the server clears all active rooms.
- **Mobile reconnection**: the companion app automatically retries with exponential backoff (up to 6 attempts) and re-joins the room on reconnect.
- **Player signatures**: players can draw their name on the join screen; the signature displays on the scoreboard and Final Jeopardy reveal cards.
- **Offline/local mode**: the web board can be used without a server for a single-device solo game (manual clue picking, no buzzers).
- `mobile/` is a browser-based React app — not a native or Expo app.
