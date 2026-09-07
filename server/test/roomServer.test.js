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
  // Buzzers no longer auto-open on select — the host reads the clue first.
  sendMessage(host, "host:setBuzzersOpen", { isOpen: true });

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
  sendMessage(host, "host:setBuzzersOpen", { isOpen: true });
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
  sendMessage(host, "host:setBuzzersOpen", { isOpen: true });
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

test("board disconnect keeps the room alive so the board can reconnect", () => {
  const server = createRoomServer();
  const board = connectClient(server);
  const host = connectClient(server);
  const player = connectClient(server);

  sendMessage(board, "board:createRoom", { roomCode: "ZZ99" });
  sendMessage(host, "host:joinRoom", { roomCode: "ZZ99" });
  sendMessage(player, "player:joinRoom", { roomCode: "ZZ99", playerName: "Sam" });
  board.close();

  // Host and player are still connected — the room survives for a board rejoin.
  assert.equal(server.rooms.has("ZZ99"), true);

  const newBoard = connectClient(server);
  sendMessage(newBoard, "board:rejoinRoom", { roomCode: "ZZ99" });
  const rejoined = lastMessageOfType(newBoard, "room:state") || lastMessageOfType(newBoard, "board:roomCreated");
  assert.ok(rejoined, "reconnecting board receives room state");
});

test("board disconnect closes the room once everyone else has left", () => {
  const server = createRoomServer();
  const board = connectClient(server);

  sendMessage(board, "board:createRoom", { roomCode: "ZZ98" });
  board.close();

  assert.equal(server.rooms.has("ZZ98"), false);
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

function startGameWithTwoPlayers(server, code) {
  const board = connectClient(server);
  const host = connectClient(server);
  const p1 = connectClient(server);
  const p2 = connectClient(server);
  sendMessage(board, "board:createRoom", { roomCode: code });
  sendMessage(host, "host:joinRoom", { roomCode: code });
  sendMessage(p1, "player:joinRoom", { roomCode: code, playerName: "A" });
  sendMessage(p2, "player:joinRoom", { roomCode: code, playerName: "B" });
  return { board, host, p1, p2 };
}

test("host can undo an incorrect ruling", () => {
  const server = createRoomServer();
  const { host, p1 } = startGameWithTwoPlayers(server, "UNDO");

  sendMessage(host, "host:selectClue", { clueId: "r1-science-200-0", clueLabel: "x", roundLabel: "Round 1", clueValue: 200 });
  sendMessage(host, "host:setBuzzersOpen", { isOpen: true });
  sendMessage(p1, "player:buzz");
  sendMessage(host, "host:markIncorrect");

  let room = server.toRoomState("UNDO");
  assert.equal(room.players.find((p) => p.name === "A").score, -200);
  assert.equal(room.canUndoRuling, true);

  sendMessage(host, "host:undoRuling");
  room = server.toRoomState("UNDO");
  assert.equal(room.players.find((p) => p.name === "A").score, 0);
  assert.equal(room.firstBuzzedPlayerName, "A");
  assert.equal(room.canUndoRuling, false);
});

test("host can reopen the last answered clue", () => {
  const server = createRoomServer();
  const { host } = startGameWithTwoPlayers(server, "ROPN");

  sendMessage(host, "host:selectClue", { clueId: "r1-science-400-0", clueLabel: "x", roundLabel: "Round 1", clueValue: 400 });
  sendMessage(host, "host:revealAnswer");
  sendMessage(host, "host:closeClue");

  let room = server.toRoomState("ROPN");
  assert.equal(room.selectedClueId, null);
  assert.ok(room.answeredClueIds.includes("r1-science-400-0"));

  sendMessage(host, "host:reopenClue");
  room = server.toRoomState("ROPN");
  assert.equal(room.selectedClueId, "r1-science-400-0");
  assert.equal(room.selectedClueValue, 400);
  assert.equal(room.answeredClueIds.includes("r1-science-400-0"), false);
});

test("host can award a no-buzz clue to a chosen player", () => {
  const server = createRoomServer();
  const { host } = startGameWithTwoPlayers(server, "AWRD");

  sendMessage(host, "host:selectClue", { clueId: "r1-science-600-0", clueLabel: "x", roundLabel: "Round 1", clueValue: 600 });
  sendMessage(host, "host:setBuzzersOpen", { isOpen: true });
  const room0 = server.toRoomState("AWRD");
  const bId = room0.players.find((p) => p.name === "B").id;

  sendMessage(host, "host:awardClue", { playerId: bId });
  let room = server.toRoomState("AWRD");
  assert.equal(room.players.find((p) => p.name === "B").score, 600);
  assert.equal(room.boardOwnerPlayerName, "B");

  sendMessage(host, "host:undoRuling");
  room = server.toRoomState("AWRD");
  assert.equal(room.players.find((p) => p.name === "B").score, 0);
});

test("a player can rename, but not to a name already in use", () => {
  const server = createRoomServer();
  const { p1 } = startGameWithTwoPlayers(server, "RNME");

  sendMessage(p1, "player:updateName", { name: "B" });
  assert.equal(lastMessageOfType(p1, "error").payload.message, "That name is already in use in this room");

  sendMessage(p1, "player:updateName", { name: "Alexandra" });
  const room = server.toRoomState("RNME");
  assert.ok(room.players.some((p) => p.name === "Alexandra"));
});

test("host score edits are capped to a sane range", () => {
  const server = createRoomServer();
  const { host } = startGameWithTwoPlayers(server, "CLMP");
  const aId = server.toRoomState("CLMP").players.find((p) => p.name === "A").id;

  sendMessage(host, "host:updateScore", { playerId: aId, delta: 999999999 });
  const room = server.toRoomState("CLMP");
  assert.ok(room.players.find((p) => p.name === "A").score <= 1000000);
});

test("ending the game shows the final scoreboard instead of closing the room", () => {
  const server = createRoomServer();
  const { host } = startGameWithTwoPlayers(server, "ENDG");

  sendMessage(host, "host:endGame");
  assert.equal(server.rooms.has("ENDG"), true);
  assert.equal(server.toRoomState("ENDG").gamePhase, "game-over");

  sendMessage(host, "host:restartGame");
  assert.equal(server.toRoomState("ENDG").gamePhase, "playing");

  sendMessage(host, "host:closeRoom");
  assert.equal(server.rooms.has("ENDG"), false);
});

test("a kicked player is soft-removed and can be restored or rejoin", () => {
  const server = createRoomServer();
  const { host } = startGameWithTwoPlayers(server, "KICK");
  const bId = server.toRoomState("KICK").players.find((p) => p.name === "B").id;
  sendMessage(host, "host:updateScore", { playerId: bId, delta: 800 });

  sendMessage(host, "host:kickPlayer", { playerId: bId });
  let b = server.toRoomState("KICK").players.find((p) => p.id === bId);
  assert.equal(b.isRemoved, true);
  assert.equal(b.score, 800, "score is preserved");

  sendMessage(host, "host:restorePlayer", { playerId: bId });
  b = server.toRoomState("KICK").players.find((p) => p.id === bId);
  assert.equal(b.isRemoved, false);

  // …and a rejoin by the same name also un-removes.
  sendMessage(host, "host:kickPlayer", { playerId: bId });
  const rejoin = connectClient(server);
  sendMessage(rejoin, "player:joinRoom", { roomCode: "KICK", playerName: "B" });
  b = server.toRoomState("KICK").players.find((p) => p.id === bId);
  assert.equal(b.isRemoved, false);
  assert.equal(b.score, 800);
});

test("host can void a Daily Double and reset lockouts", () => {
  const server = createRoomServer();
  const { host, p1 } = startGameWithTwoPlayers(server, "VOID");

  sendMessage(host, "host:selectClue", { clueId: "r1-science-800-0", clueLabel: "x", roundLabel: "Round 1", clueValue: 800, isDailyDouble: true });
  let room = server.toRoomState("VOID");
  assert.equal(room.isDailyDoubleActive, true);
  assert.equal(room.selectedClueValue, 800);

  sendMessage(host, "host:voidDailyDouble");
  room = server.toRoomState("VOID");
  assert.equal(room.isDailyDoubleActive, false);
  assert.equal(room.answerRevealed, true);

  sendMessage(host, "host:closeClue");
  sendMessage(host, "host:selectClue", { clueId: "r1-science-1000-0", clueLabel: "x", roundLabel: "Round 1", clueValue: 1000 });
  sendMessage(host, "host:setBuzzersOpen", { isOpen: true });
  sendMessage(p1, "player:buzz");
  sendMessage(host, "host:markIncorrect");
  room = server.toRoomState("VOID");
  assert.ok(room.lockedOutPlayerIds.length >= 1);

  sendMessage(host, "host:resetLockouts");
  room = server.toRoomState("VOID");
  assert.equal(room.lockedOutPlayerIds.length, 0);
  assert.equal(room.buzzersOpen, true);
});

test("Final Jeopardy clue can be swapped before wagering", () => {
  const server = createRoomServer();
  const { host } = startGameWithTwoPlayers(server, "FJRR");

  sendMessage(host, "host:startFinalJeopardy", { category: "FIRST", question: "q1", answer: "a1" });
  assert.equal(server.toRoomState("FJRR").finalCategory, "FIRST");

  sendMessage(host, "host:startFinalJeopardy", { category: "SECOND", question: "q2", answer: "a2" });
  assert.equal(server.toRoomState("FJRR").gamePhase, "final-category");
  assert.equal(server.toRoomState("FJRR").finalCategory, "SECOND");
});

test("host sees the Final Jeopardy clue while wagering; players do not", () => {
  const server = createRoomServer();
  const { host, p1 } = startGameWithTwoPlayers(server, "FJHQ");

  sendMessage(host, "host:startFinalJeopardy", { category: "PRESIDENTS", question: "He was the 35th president", answer: "JFK" });

  assert.equal(lastMessageOfType(host, "room:state").payload.room.gamePhase, "final-category");
  assert.equal(lastMessageOfType(host, "room:state").payload.room.finalQuestion, "He was the 35th president");
  assert.equal(lastMessageOfType(p1, "room:state").payload.room.finalQuestion, null);
});

test("clue value comes from the clue id, not a tampered payload", () => {
  const server = createRoomServer();
  const { host, p1 } = startGameWithTwoPlayers(server, "TMPR");

  sendMessage(host, "host:selectClue", { clueId: "r1-science-200-0", clueLabel: "x", roundLabel: "Round 1", clueValue: 999999 });
  assert.equal(server.toRoomState("TMPR").selectedClueValue, 200);

  sendMessage(host, "host:setBuzzersOpen", { isOpen: true });
  sendMessage(p1, "player:buzz");
  sendMessage(host, "host:revealAnswer");
  assert.equal(server.toRoomState("TMPR").players.find((p) => p.name === "A").score, 200);
});