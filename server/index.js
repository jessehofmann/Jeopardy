const http = require("http");
const { WebSocketServer } = require("ws");
const { createRoomServer } = require("./roomServer");

function startServer({ port = Number(process.env.PORT || 8080) } = {}) {
  // Plain HTTP server — handles the health check probe from Fly.io / load balancers
  const httpServer = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
  });

  const wss = new WebSocketServer({ server: httpServer });
  const roomServer = createRoomServer();

  wss.on("error", (error) => {
    console.error("WebSocket server error:", error.message || error);
    process.exit(1);
  });

  wss.on("connection", (ws) => {
    roomServer.connect(ws);
  });

  httpServer.listen(port, () => {
    console.log(`Jeopardy realtime server listening on port ${port}`);
  });

  return { wss, httpServer, roomServer };
}

if (require.main === module) {
  startServer();
}

module.exports = {
  startServer,
};
