# Jeopardy Game Project

This repo contains a three-part Jeopardy-style game setup:

- `web`: the big-screen board experience
- `mobile`: a browser-based phone companion for host and players
- `server`: a WebSocket room server that keeps the board and companion clients in sync
- `shared`: the shared clue catalog and room/game TypeScript contracts consumed by the frontends

## Current Architecture

The main board starts a new room from the web app and displays the room code.

- The board runs on `web` and creates a room over WebSockets.
- The host joins that room from the phone companion and controls clue selection, buzzers, and reveal flow.
- Players join the same room from their phones and use the buzzer interface.
- The server keeps room state in memory and broadcasts updates to all connected clients.

Both frontend apps now read their clue catalog and room types from `shared` so the board and companion stay aligned.

## Run

From the repository root:

```bash
npm install
npm run start:all
```

This starts:

- Web board app on `http://localhost:3000`
- Companion site on `http://localhost:3001`
- Realtime server on `ws://localhost:8080`

The Vite apps proxy `/ws` to the realtime server during local development.

## Other Scripts

```bash
npm run start:clients
npm run start:server
npm run build:web
npm run build:companion
npm test
```

`npm test` runs the server's automated room-flow tests.

## Repo Notes

- The `mobile` folder is a browser companion app, not an Expo/native app.
- Room state is in-memory only. Restarting the server clears all rooms.
- The frontend builds currently depend on the server for synced play; without it, the companion flow is unavailable.