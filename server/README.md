# Jeopardy Realtime Server

This WebSocket server powers room-based realtime sync for the companion site.

## Run

```bash
npm install
npm start
```

Default URL:

`ws://localhost:8080`

## Test

```bash
npm test
```

## If Port 8080 Is Already In Use

Either stop the existing process, or run this server on another port:

```powershell
$env:PORT=8081
npm start
```

If you change the port, set `VITE_WS_URL` in the companion site to match.

## Supported Events

Client -> Server:

- `board:createRoom` `{ roomCode }`
- `host:joinRoom` `{ roomCode }`
- `player:joinRoom` `{ roomCode, playerName }`
- `player:buzz`
- `host:updateScore` `{ playerId, delta }`
- `host:setBuzzersOpen` `{ isOpen }`
- `host:clearBuzz`
- `host:selectClue` `{ clueId, clueLabel, roundLabel, clueValue }`
- `host:revealAnswer`
- `host:closeClue`
- `host:updateBoardState` `{ roundLabel?, clueLabel? }`
- `board:clueAnswered` `{ clueId }`
- `session:leave`

Server -> Client:

- `session:welcome`
- `board:roomCreated`
- `host:joined`
- `room:joined`
- `room:state`
- `session:left`
- `error`
