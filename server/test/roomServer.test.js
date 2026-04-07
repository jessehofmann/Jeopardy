const assert = require("node:assert/strict");
const test = require("node:test");
const { EventEmitter } = require("node:events");

const { createRoomServer } = require("../roomServer");

class FakeSocket extends EventEmitter {
  constructor() {
    super();
    this.OPEN = 1;
    this.readyState = this.OPEN;
    this.messages = [];
  }

  send(payload) {
    this.messages.push(JSON.parse(payload));
  }

  close() {
    this.readyState = 3;
    this.emit("close");
  }
}

function connectClient(server) {
  const socket = new FakeSocket();
  server.connect(socket);
  return socket;
}

function sendMessage(socket, type, payload = {}) {
  socket.emit("message", JSON.stringify({ type, payload }));
}

function lastMessageOfType(socket, type) {
  return [...socket.messages].reverse().find((message) => message.type === type);
}

test("board can create a room and host/player receive room state", () => {
  const server = createRoomServer();
  const board = connectClient(server);
  const host = connectClient(server);
  const player = connectClient(server);

  sendMessage(board, "board:createRoom", { roomCode: "ABCD" });
  sendMessage(host, "host:joinRoom", { roomCode: "ABCD" });
  sendMessage(player, "player:joinRoom", { roomCode: "ABCD", playerName: "Alex" });

  const roomCreated = lastMessageOfType(board, "board:roomCreated");
  const hostJoined = lastMessageOfType(host, "host:joined");
  const playerJoined = lastMessageOfType(player, "room:joined");
  const boardState = lastMessageOfType(board, "room:state");

  assert.equal(roomCreated.payload.roomCode, "ABCD");
  assert.equal(hostJoined.payload.roomCode, "ABCD");
  assert.equal(playerJoined.payload.playerName, "Alex");
  assert.equal(boardState.payload.room.players.length, 1);
  assert.equal(boardState.payload.room.isHostConnected, true);
  assert.equal(boardState.payload.room.boardOwnerPlayerName, "Alex");
});

test("first player buzz locks the room and correct awards clue value once", () => {
  const server = createRoomServer();
  const board = connectClient(server);
  const host = connectClient(server);
  const playerOne = connectClient(server);
  const playerTwo = connectClient(server);

  sendMessage(board, "board:createRoom", { roomCode: "GAME" });
  sendMessage(host, "host:joinRoom", { roomCode: "GAME" });
  sendMessage(playerOne, "player:joinRoom", { roomCode: "GAME", playerName: "A" });
  sendMessage(playerTwo, "player:joinRoom", { roomCode: "GAME", playerName: "B" });
  sendMessage(host, "host:selectClue", {
    clueId: "1-1",
    clueLabel: "What is H2O?",
    roundLabel: "Round 1",
    clueValue: 200,
  });

  const roomAfterReveal = server.toRoomState("GAME");
  assert.equal(roomAfterReveal.buzzersOpen, true);

  sendMessage(playerOne, "player:buzz");
  sendMessage(playerTwo, "player:buzz");
  sendMessage(host, "host:revealAnswer");
  sendMessage(host, "host:closeClue");
  sendMessage(host, "host:closeClue");

  const room = server.toRoomState("GAME");
  const winningPlayer = room.players.find((player) => player.name === "A");
  const otherPlayer = room.players.find((player) => player.name === "B");

  assert.equal(room.firstBuzzedPlayerId, null);
  assert.equal(room.firstBuzzedPlayerName, null);
  assert.equal(room.buzzersOpen, false);
  assert.equal(winningPlayer.score, 200);
  assert.equal(otherPlayer.score, 0);

  sendMessage(host, "host:clearBuzz");

  const clearedRoom = server.toRoomState("GAME");
  assert.equal(clearedRoom.firstBuzzedPlayerId, null);
  assert.equal(clearedRoom.firstBuzzedPlayerName, null);
});

test("incorrect answer reopens buzzers for the same active clue", () => {
  const server = createRoomServer();
  const board = connectClient(server);
  const host = connectClient(server);
  const playerOne = connectClient(server);
  const playerTwo = connectClient(server);

  sendMessage(board, "board:createRoom", { roomCode: "BUZZ" });
  sendMessage(host, "host:joinRoom", { roomCode: "BUZZ" });
  sendMessage(playerOne, "player:joinRoom", { roomCode: "BUZZ", playerName: "A" });
  sendMessage(playerTwo, "player:joinRoom", { roomCode: "BUZZ", playerName: "B" });
  sendMessage(host, "host:selectClue", {
    clueId: "1-2",
    clueLabel: "What planet is closest to the sun?",
    roundLabel: "Round 1",
    clueValue: 400,
  });
  sendMessage(playerOne, "player:buzz");

  let room = server.toRoomState("BUZZ");
  assert.equal(room.buzzersOpen, false);
  assert.equal(room.firstBuzzedPlayerName, "A");
  assert.equal(room.players.find((player) => player.name === "A").score, 0);

  sendMessage(host, "host:markIncorrect");

  room = server.toRoomState("BUZZ");
  assert.equal(room.selectedClueId, "1-2");
  assert.equal(room.buzzersOpen, true);
  assert.equal(room.firstBuzzedPlayerId, null);
  assert.equal(room.firstBuzzedPlayerName, null);
  assert.equal(room.players.find((player) => player.name === "A").score, -400);

  sendMessage(playerTwo, "player:buzz");
  room = server.toRoomState("BUZZ");
  assert.equal(room.firstBuzzedPlayerName, "B");
});

test("board owner updates to most recent correct answer", () => {
  const server = createRoomServer();
  const board = connectClient(server);
  const host = connectClient(server);
  const playerOne = connectClient(server);
  const playerTwo = connectClient(server);

  sendMessage(board, "board:createRoom", { roomCode: "OWNR" });
  sendMessage(host, "host:joinRoom", { roomCode: "OWNR" });
  sendMessage(playerOne, "player:joinRoom", { roomCode: "OWNR", playerName: "First" });
  sendMessage(playerTwo, "player:joinRoom", { roomCode: "OWNR", playerName: "Second" });

  let room = server.toRoomState("OWNR");
  assert.equal(room.boardOwnerPlayerName, "First");

  sendMessage(host, "host:selectClue", {
    clueId: "1-3",
    clueLabel: "What is the speed of light?",
    roundLabel: "Round 1",
    clueValue: 600,
  });
  sendMessage(playerTwo, "player:buzz");
  sendMessage(host, "host:revealAnswer");

  room = server.toRoomState("OWNR");
  assert.equal(room.boardOwnerPlayerName, "Second");
});

test("host can reveal answer with no buzz and close clue without scoring", () => {
  const server = createRoomServer();
  const board = connectClient(server);
  const host = connectClient(server);
  const player = connectClient(server);

  sendMessage(board, "board:createRoom", { roomCode: "REVL" });
  sendMessage(host, "host:joinRoom", { roomCode: "REVL" });
  sendMessage(player, "player:joinRoom", { roomCode: "REVL", playerName: "Solo" });
  sendMessage(host, "host:selectClue", {
    clueId: "1-4",
    clueLabel: "What is the atomic number of gold?",
    roundLabel: "Round 1",
    clueValue: 800,
  });

  sendMessage(host, "host:revealAnswer");
  let room = server.toRoomState("REVL");
  assert.equal(room.answerRevealed, true);
  assert.equal(room.players.find((item) => item.name === "Solo").score, 0);

  sendMessage(host, "host:closeClue");
  room = server.toRoomState("REVL");
  assert.equal(room.selectedClueId, null);
  assert.equal(room.players.find((item) => item.name === "Solo").score, 0);
});

test("active contestant names must be unique within a room", () => {
  const server = createRoomServer();
  const board = connectClient(server);
  const firstPlayer = connectClient(server);
  const secondPlayer = connectClient(server);

  sendMessage(board, "board:createRoom", { roomCode: "NAME" });
  sendMessage(firstPlayer, "player:joinRoom", { roomCode: "NAME", playerName: "Chris" });
  sendMessage(secondPlayer, "player:joinRoom", { roomCode: "NAME", playerName: "chris" });

  assert.equal(lastMessageOfType(secondPlayer, "error").payload.message, "That name is already in use in this room");
});

test("contestant can rejoin with the same name and keep identity and score", () => {
  const server = createRoomServer();
  const board = connectClient(server);
  const host = connectClient(server);
  const player = connectClient(server);

  sendMessage(board, "board:createRoom", { roomCode: "BACK" });
  sendMessage(host, "host:joinRoom", { roomCode: "BACK" });
  sendMessage(player, "player:joinRoom", { roomCode: "BACK", playerName: "Taylor" });

  const firstJoin = lastMessageOfType(player, "room:joined");
  const originalPlayerId = firstJoin.payload.playerId;

  sendMessage(host, "host:updateScore", { playerId: originalPlayerId, delta: 400 });
  sendMessage(player, "session:leave");

  const roomAfterLeave = server.toRoomState("BACK");
  const disconnectedPlayer = roomAfterLeave.players.find((entry) => entry.id === originalPlayerId);
  assert.equal(disconnectedPlayer.isConnected, false);

  const rejoiningPlayer = connectClient(server);
  sendMessage(rejoiningPlayer, "player:joinRoom", { roomCode: "BACK", playerName: "Taylor" });

  const secondJoin = lastMessageOfType(rejoiningPlayer, "room:joined");
  const room = server.toRoomState("BACK");
  const playerRecord = room.players.find((entry) => entry.id === originalPlayerId);

  assert.equal(secondJoin.payload.playerId, originalPlayerId);
  assert.equal(playerRecord.name, "Taylor");
  assert.equal(playerRecord.score, 400);
  assert.equal(playerRecord.isConnected, true);
});

test("board disconnect closes the room for connected clients", () => {
  const server = createRoomServer();
  const board = connectClient(server);
  const host = connectClient(server);
  const player = connectClient(server);

  sendMessage(board, "board:createRoom", { roomCode: "ZZ99" });
  sendMessage(host, "host:joinRoom", { roomCode: "ZZ99" });
  sendMessage(player, "player:joinRoom", { roomCode: "ZZ99", playerName: "Sam" });
  board.close();

  assert.equal(server.rooms.has("ZZ99"), false);
  assert.equal(lastMessageOfType(host, "error").payload.message, "Board disconnected. Room closed.");
  assert.equal(lastMessageOfType(player, "error").payload.message, "Board disconnected. Room closed.");
});

test("room state tracks host connection and defaults missing player connection to connected", () => {
  const server = createRoomServer();
  const board = connectClient(server);
  const host = connectClient(server);
  const player = connectClient(server);

  sendMessage(board, "board:createRoom", { roomCode: "HOST" });
  sendMessage(player, "player:joinRoom", { roomCode: "HOST", playerName: "Dana" });

  let room = server.toRoomState("HOST");
  assert.equal(room.isHostConnected, false);
  assert.equal(room.players[0].isConnected, true);

  // Simulate a pre-existing room entry that did not include isConnected.
  const rawRoom = server.rooms.get("HOST");
  rawRoom.players = rawRoom.players.map((entry) => ({
    id: entry.id,
    name: entry.name,
    score: entry.score,
    status: entry.status,
  }));

  room = server.toRoomState("HOST");
  assert.equal(room.players[0].isConnected, true);

  sendMessage(host, "host:joinRoom", { roomCode: "HOST" });
  room = server.toRoomState("HOST");
  assert.equal(room.isHostConnected, true);

  host.close();
  room = server.toRoomState("HOST");
  assert.equal(room.isHostConnected, false);
});