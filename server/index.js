const { WebSocketServer } = require("ws");
const { createRoomServer } = require("./roomServer");

function startServer({ port = Number(process.env.PORT || 8080) } = {}) {
  const wss = new WebSocketServer({ port });
  const roomServer = createRoomServer();

  wss.on("error", (error) => {
    if (error && error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use. Stop the other server process or start with a different PORT.`);
      console.error("Example: PowerShell -> $env:PORT=8081; npm run start:server");
      process.exit(1);
    }

    console.error("WebSocket server error:", error.message || error);
    process.exit(1);
  });

  wss.on("connection", (ws) => {
    roomServer.connect(ws);
  });

  console.log(`Jeopardy realtime server listening on ws://localhost:${port}`);
  return { wss, roomServer };
}

if (require.main === module) {
  startServer();
}

module.exports = {
  startServer,
};
