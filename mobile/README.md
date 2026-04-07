# Jeopardy Companion Site

This package contains the browser-based phone companion for the Jeopardy project.

## Roles

- Host: joins an existing board room and controls clue flow, buzzers, and reveal actions
- Player: joins the room and uses the buzzer interface

## Run

```bash
npm install
npm start
```

Default dev URL: `http://localhost:3001`

You also need the realtime server running:

```bash
npm run start:server
```

During local development, `/ws` is proxied to `ws://127.0.0.1:8080`.

## WebSocket URL Override

Set `VITE_WS_URL` if you want the companion app to connect somewhere other than the default proxied local server.

## Data And Types

The companion app uses the shared clue catalog and room-state contracts from `../shared/src` through the `@shared` alias.