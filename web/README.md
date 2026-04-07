# Jeopardy Web Board

This package contains the big-screen board for the Jeopardy project.

## What It Does

- Starts a room with a 4-character room code
- Connects to the realtime server through `/ws`
- Renders the clue board and scoreboard
- Mirrors host-selected clues and buzz/reveal state from the companion flow

The current entry points are:

- `src/main.tsx`
- `src/App.tsx`
- `src/pages/MainMenu.tsx`
- `src/pages/Game.tsx`

## Run

```bash
npm install
npm start
```

Default dev URL: `http://localhost:3000`

During local development, `/ws` is proxied to `ws://127.0.0.1:8080`.

## Build

```bash
npm run build
```

## Data And Types

The board's categories and room-state types are imported from the shared source under `../shared/src` through the `@shared` alias.