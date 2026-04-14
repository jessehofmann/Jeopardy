const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const BOARD_SEED_HISTORY_LIMIT = 128;
const BUZZER_AUTO_CLOSE_MS = 5000;

function randomId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeRequestedRoomCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
}

function normalizePlayerName(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 20);

  return normalized || "Contestant";
}

function sanitizeClueIdList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];
  for (const item of value) {
    const clueId = String(item || "").trim();
    if (!clueId || seen.has(clueId)) {
      continue;
    }

    seen.add(clueId);
    normalized.push(clueId);
    if (normalized.length >= 400) {
      break;
    }
  }

  return normalized;
}

function sanitizeStr(s, max) {
  return String(s || "").trim().slice(0, max);
}

function buildCustomCategories(rawCats, round) {
  if (!Array.isArray(rawCats)) return null;
  return rawCats.slice(0, 6).map((cat, catIdx) => {
    const clues = Array.isArray(cat.clues)
      ? cat.clues.slice(0, 5).map((cl, clIdx) => ({
          id: `custom-r${round}-${catIdx}-${clIdx}`,
          value: typeof cl.value === "number" ? cl.value : (round === 1 ? [200, 400, 600, 800, 1000][clIdx] || 200 : [400, 800, 1200, 1600, 2000][clIdx] || 400),
          question: sanitizeStr(cl.question, 300),
          answer: sanitizeStr(cl.answer, 200),
          isAnswered: false,
          isDailyDouble: Boolean(cl.isDailyDouble),
        }))
      : [];
    return {
      id: `custom-r${round}-cat-${catIdx}`,
      name: sanitizeStr(cat.name, 50),
      clues,
    };
  });
}

function sanitizeCustomBoard(raw) {
  const round1 = buildCustomCategories(raw.round1, 1);
  if (!round1 || round1.length === 0) return null;
  return {
    name: sanitizeStr(raw.name, 100),
    round1,
    round2: raw.round2 ? buildCustomCategories(raw.round2, 2) : null,
    finalJeopardy: raw.finalJeopardy ? {
      category: sanitizeStr(raw.finalJeopardy.category, 80),
      question: sanitizeStr(raw.finalJeopardy.question, 300),
      answer: sanitizeStr(raw.finalJeopardy.answer, 200),
    } : null,
  };
}

function createRoomServer() {
  const rooms = new Map();
  const clients = new Map();
  const recentBoardSeeds = [];
  const recentBoardSeedSet = new Set();

  function makeRoomCode() {
    let code = "";
    do {
      code = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    } while (rooms.has(code));
    return code;
  }

  function makeBoardSeed() {
    let seed = "";

    do {
      seed = Math.random().toString(36).slice(2, 12).toUpperCase();
    } while (!seed || recentBoardSeedSet.has(seed));

    recentBoardSeeds.push(seed);
    recentBoardSeedSet.add(seed);

    if (recentBoardSeeds.length > BOARD_SEED_HISTORY_LIMIT) {
      const evicted = recentBoardSeeds.shift();
      if (evicted) {
        recentBoardSeedSet.delete(evicted);
      }
    }

    return seed;
  }

  function send(ws, type, payload = {}) {
    const openState = typeof ws.OPEN === "number" ? ws.OPEN : 1;
    if (ws.readyState !== openState || typeof ws.send !== "function") {
      return;
    }

    ws.send(JSON.stringify({ type, payload, serverTimestamp: Date.now() }));
  }

  function sendError(ws, message) {
    send(ws, "error", { message });
  }

  function toRoomState(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) {
      return null;
    }

    const firstBuzzedPlayer = room.players.find((player) => player.id === room.firstBuzzedPlayerId) || null;
    const boardOwnerPlayer = room.players.find((player) => player.id === room.boardOwnerPlayerId) || null;
    const isHostConnected = Boolean(room.hostId && clients.has(room.hostId));
    const players = room.players.map((player) => ({
      ...player,
      isConnected: player.isConnected !== false,
    }));

    return {
      roomCode,
      boardSeed: room.boardSeed,
      round1ExcludeClueIds: room.round1ExcludeClueIds,
      round2ExcludeClueIds: room.round2ExcludeClueIds,
      roundLabel: room.roundLabel,
      clueLabel: room.clueLabel,
      isHostConnected,
      boardOwnerPlayerId: room.boardOwnerPlayerId,
      boardOwnerPlayerName: boardOwnerPlayer ? boardOwnerPlayer.name : null,
      selectedClueId: room.selectedClueId,
      selectedClueValue: room.selectedClueValue || 0,
      answerRevealed: room.answerRevealed,
      answeredClueIds: room.answeredClueIds,
      revealedCategoryIds: room.revealedCategoryIds || [],
      buzzersOpen: room.buzzersOpen,
      lockedOutPlayerIds: room.lockedOutPlayerIds || [],
      firstBuzzedPlayerId: room.firstBuzzedPlayerId,
      firstBuzzedPlayerName: firstBuzzedPlayer ? firstBuzzedPlayer.name : null,
      isDailyDoubleActive: room.isDailyDoubleActive,
      dailyDoubleWager: room.dailyDoubleWager,
      answerDeadlineMs: room._answerDeadlineMs ?? null,
      buzzerDeadlineMs: room.buzzersOpen ? (room._buzzerDeadlineMs ?? null) : null,
      gamePhase: room.gamePhase || "playing",
      finalCategory: room.finalCategory || null,
      finalQuestion: (room.gamePhase === "final-question" || room.gamePhase === "final-reveal" || room.gamePhase === "game-over")
        ? room._finalQuestion
        : null,
      finalAnswer: (room.gamePhase !== "playing")
        ? room._finalAnswer
        : null,
      finalAnswerShown: room.finalAnswerShown ?? false,
      finalQuestionDeadlineMs: room.gamePhase === "final-question" ? (room._finalQuestionDeadlineMs ?? null) : null,
      customBoard: room.customBoard ?? null,
      boardIsReady: room.boardIsReady ?? false,
      players,
    };
  }

  function broadcastRoom(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) {
      return;
    }

    const roomState = toRoomState(roomCode);
    for (const clientId of room.connections) {
      const client = clients.get(clientId);
      if (client) {
        send(client.ws, "room:state", { room: roomState });
      }
    }
  }

  function createRoomForBoard(clientId, payload) {
    const requestedRoomCode = payload?.roomCode;
    let roomCode = normalizeRequestedRoomCode(requestedRoomCode);
    if (!roomCode) {
      roomCode = makeRoomCode();
    }

    if (roomCode.length !== 4) {
      return { ok: false, message: "Room code must be 4 letters or numbers" };
    }

    if (rooms.has(roomCode)) {
      return { ok: false, message: "That room code is already in use" };
    }

    const room = {
      roomCode,
      boardSeed: makeBoardSeed(),
      round1ExcludeClueIds: sanitizeClueIdList(payload?.round1ExcludeClueIds),
      round2ExcludeClueIds: sanitizeClueIdList(payload?.round2ExcludeClueIds),
      boardId: clientId,
      hostId: null,
      boardOwnerPlayerId: null,
      roundLabel: "Round 1",
      clueLabel: "Select a clue",
      selectedClueId: null,
      selectedClueValue: 0,
      answerRevealed: false,
      answeredClueIds: [],
      revealedCategoryIds: [],
      buzzersOpen: false,
      lockedOutPlayerIds: [],
      firstBuzzedPlayerId: null,
      _buzzerTimer: null,
      _buzzerDeadlineMs: null,
      _answerTimer: null,
      _answerDeadlineMs: null,
      _finalQuestionDeadlineMs: null,
      isDailyDoubleActive: false,
      dailyDoubleWager: null,
      gamePhase: "playing",
      finalCategory: null,
      _finalQuestion: null,
      _finalAnswer: null,
      finalAnswerShown: false,
      customBoard: null,
      boardIsReady: false,
      players: [],
      playerConnectionById: new Map(),
      connections: new Set([clientId]),
    };

    // Apply custom board from payload if provided
    if (payload?.customBoard && typeof payload.customBoard === "object") {
      const sanitized = sanitizeCustomBoard(payload.customBoard);
      if (sanitized) {
        room.customBoard = sanitized;
      }
    }

    rooms.set(roomCode, room);

    const client = clients.get(clientId);
    if (!client) {
      return { ok: false, message: "Board client not found" };
    }

    client.roomCode = roomCode;
    client.role = "board";

    send(client.ws, "board:roomCreated", { roomCode, room: toRoomState(roomCode) });
    return { ok: true, roomCode };
  }

  function rejoinRoomAsBoard(clientId, roomCode) {
    const room = rooms.get(roomCode);
    if (!room) {
      return { ok: false, message: "Room not found" };
    }

    // Remove old board client from connections if still present
    if (room.boardId && room.boardId !== clientId) {
      room.connections.delete(room.boardId);
    }

    room.boardId = clientId;
    room.connections.add(clientId);

    const client = clients.get(clientId);
    if (!client) {
      return { ok: false, message: "Board client not found" };
    }

    client.roomCode = roomCode;
    client.role = "board";

    send(client.ws, "board:roomCreated", { roomCode, room: toRoomState(roomCode) });
    return { ok: true };
  }

  function joinRoomAsHost(clientId, roomCode) {
    const room = rooms.get(roomCode);
    if (!room) {
      return { ok: false, message: "Room not found" };
    }

    room.connections.add(clientId);
    room.hostId = clientId;

    const client = clients.get(clientId);
    if (client) {
      client.roomCode = roomCode;
      client.role = "host";
    }

    send(client.ws, "host:joined", { roomCode, room: toRoomState(roomCode) });
    broadcastRoom(roomCode);
    return { ok: true };
  }

  function joinRoomAsPlayer(clientId, roomCode, playerName, payload = {}) {
    const room = rooms.get(roomCode);
    if (!room) {
      return { ok: false, message: "Room not found" };
    }

    const normalizedName = normalizePlayerName(playerName);
    const existingPlayer = room.players.find(
      (player) => player.name.toLowerCase() === normalizedName.toLowerCase()
    );

    if (existingPlayer) {
      const existingConnectionId = room.playerConnectionById.get(existingPlayer.id);
      if (existingConnectionId && existingConnectionId !== clientId) {
        return { ok: false, message: "That name is already in use in this room" };
      }

      room.connections.add(clientId);
      room.playerConnectionById.set(existingPlayer.id, clientId);

      existingPlayer.status = room.firstBuzzedPlayerId === existingPlayer.id
        ? "buzzed"
        : room.buzzersOpen
          ? "ready"
          : "locked";
      existingPlayer.isConnected = true;

      const reconnectingClient = clients.get(clientId);
      if (!reconnectingClient) {
        return { ok: false, message: "Player client not found" };
      }

      reconnectingClient.roomCode = roomCode;
      reconnectingClient.role = "player";
      reconnectingClient.playerId = existingPlayer.id;

      if (!room.boardOwnerPlayerId) {
        room.boardOwnerPlayerId = existingPlayer.id;
      }

      send(reconnectingClient.ws, "room:joined", {
        roomCode,
        playerId: existingPlayer.id,
        playerName: existingPlayer.name,
        room: toRoomState(roomCode),
      });

      broadcastRoom(roomCode);
      return { ok: true, playerId: existingPlayer.id, rejoined: true };
    }

    if (room.players.length >= 8) {
      return { ok: false, message: "Room is full (max 8 players)" };
    }

    const rawSig = String(payload?.nameSignatureDataUrl || "");
    const nameSignatureDataUrl = rawSig.startsWith("data:image/") && rawSig.length < 65536
      ? rawSig : null;

    const player = {
      id: randomId("player"),
      name: normalizedName,
      score: 0,
      status: room.buzzersOpen ? "ready" : "locked",
      isConnected: true,
      nameSignatureDataUrl,
      showNameSignature: false,
    };

    room.players.push(player);
    room.playerConnectionById.set(player.id, clientId);
    room.connections.add(clientId);

    const client = clients.get(clientId);
    if (client) {
      client.roomCode = roomCode;
      client.role = "player";
      client.playerId = player.id;
    }

    if (!room.boardOwnerPlayerId) {
      room.boardOwnerPlayerId = player.id;
    }

    send(client.ws, "room:joined", {
      roomCode,
      playerId: player.id,
      playerName: player.name,
      room: toRoomState(roomCode),
    });

    broadcastRoom(roomCode);
    return { ok: true, playerId: player.id };
  }

  function detachPlayerFromRoom(room, playerId) {
    room.playerConnectionById.delete(playerId);

    if (room.firstBuzzedPlayerId === playerId) {
      room.firstBuzzedPlayerId = null;
    }

    room.players = room.players.map((player) => {
      if (player.id === playerId) {
        return { ...player, status: "locked", isConnected: false };
      }

      return {
        ...player,
        status: room.firstBuzzedPlayerId === player.id
          ? "buzzed"
          : room.buzzersOpen
            ? "ready"
            : "locked",
      };
    });
  }

  function openBuzzers(room) {
    if (room._buzzerTimer != null) {
      clearTimeout(room._buzzerTimer);
      room._buzzerTimer = null;
    }

    room.buzzersOpen = true;
    room.firstBuzzedPlayerId = null;

    const lockedOut = new Set(room.lockedOutPlayerIds);
    room.players = room.players.map((player) => ({
      ...player,
      status: lockedOut.has(player.id) ? "locked" : "ready",
    }));

    const duration = (typeof room.buzzerDurationMs === "number" && room.buzzerDurationMs >= 1000)
      ? room.buzzerDurationMs
      : BUZZER_AUTO_CLOSE_MS;

    room._buzzerDeadlineMs = Date.now() + duration;

    room._buzzerTimer = setTimeout(() => {
      room._buzzerTimer = null;
      if (!room.buzzersOpen) return;
      room.buzzersOpen = false;
      room.players = room.players.map((player) => ({
        ...player,
        status: player.id === room.firstBuzzedPlayerId ? "buzzed" : "locked",
      }));
      broadcastRoom(room.roomCode);
    }, duration);
  }

  function closeBuzzers(room) {
    if (room._buzzerTimer != null) {
      clearTimeout(room._buzzerTimer);
      room._buzzerTimer = null;
    }

    room._buzzerDeadlineMs = null;
    room.buzzersOpen = false;
    room.players = room.players.map((player) => ({
      ...player,
      status: player.id === room.firstBuzzedPlayerId ? "buzzed" : "locked",
    }));
  }

  function handleHostControl(client, message) {
    const room = rooms.get(client.roomCode);
    if (!room || client.role !== "host") {
      sendError(client.ws, "Only host can perform this action");
      return;
    }

    if (message.type === "host:updateScore") {
      const { playerId, delta } = message.payload || {};
      const player = room.players.find((item) => item.id === playerId);
      if (!player || typeof delta !== "number") {
        sendError(client.ws, "Invalid score update");
        return;
      }

      player.score += delta;
      broadcastRoom(room.roomCode);
      return;
    }

    if (message.type === "host:setBuzzersOpen") {
      const { isOpen } = message.payload || {};
      if (typeof isOpen !== "boolean") {
        sendError(client.ws, "Invalid buzzer state");
        return;
      }

      if (isOpen && !room.selectedClueId) {
        sendError(client.ws, "Cannot open buzzers without an active clue");
        return;
      }

      if (isOpen) {
        openBuzzers(room);
      } else {
        closeBuzzers(room);
      }

      broadcastRoom(room.roomCode);
      return;
    }

    if (message.type === "host:loadCustomBoard") {
      const raw = message.payload?.board;
      if (!raw || typeof raw !== "object") {
        sendError(client.ws, "Invalid custom board data");
        return;
      }

      const sanitized = sanitizeCustomBoard(raw);
      if (!sanitized) {
        sendError(client.ws, "Custom board must have at least one Round 1 category");
        return;
      }

      room.customBoard = sanitized;

      // Reset game state for fresh start with new board
      room.answeredClueIds = [];
      room.revealedCategoryIds = [];
      room.selectedClueId = null;
      room.selectedClueValue = 0;
      room.answerRevealed = false;
      room.firstBuzzedPlayerId = null;
      room.lockedOutPlayerIds = [];
      room.buzzersOpen = false;

      broadcastRoom(room.roomCode);
      return;
    }

    if (message.type === "host:clearCustomBoard") {
      room.customBoard = null;
      room.answeredClueIds = [];
      room.revealedCategoryIds = [];
      room.selectedClueId = null;
      broadcastRoom(room.roomCode);
      return;
    }

    if (message.type === "host:clearBuzz") {
      openBuzzers(room);
      broadcastRoom(room.roomCode);
      return;
    }

    if (message.type === "host:selectClue") {
      const { clueId, clueLabel, roundLabel, clueValue, isDailyDouble, dailyDoubleWager, buzzerDurationMs } = message.payload || {};
      if (typeof clueId !== "string" || clueId.trim().length === 0) {
        sendError(client.ws, "Invalid clue selection");
        return;
      }

      room.selectedClueId = clueId.trim();
      room.selectedClueValue = typeof clueValue === "number" ? clueValue : 0;
      room.answerRevealed = false;
      room.firstBuzzedPlayerId = null;
      room.lockedOutPlayerIds = [];
      if (typeof buzzerDurationMs === "number" && buzzerDurationMs >= 1000) {
        room.buzzerDurationMs = Math.min(Math.floor(buzzerDurationMs), 30000);
      }

      room.isDailyDoubleActive = isDailyDouble === true;
      room.dailyDoubleWager = null;
      closeBuzzers(room);

      if (typeof clueLabel === "string") {
        room.clueLabel = clueLabel.slice(0, 80);
      }
      if (typeof roundLabel === "string") {
        room.roundLabel = roundLabel.slice(0, 40);
      }

      broadcastRoom(room.roomCode);
      return;
    }

    if (message.type === "host:setDailyDoubleWager") {
      if (!room.isDailyDoubleActive || !room.selectedClueId) {
        sendError(client.ws, "No active Daily Double");
        return;
      }

      const { wager } = message.payload || {};
      if (typeof wager !== "number" || wager < 0) {
        sendError(client.ws, "Wager must be at least $0");
        return;
      }

      room.dailyDoubleWager = Math.floor(wager);
      broadcastRoom(room.roomCode);
      return;
    }

    if (message.type === "host:markIncorrect") {
      if (!room.selectedClueId) {
        sendError(client.ws, "Cannot reopen buzzers without an active clue");
        return;
      }

      clearAnswerTimer(room);

      if (room.isDailyDoubleActive) {
        // Daily double wrong: deduct wager from board owner and reveal answer
        if (room.boardOwnerPlayerId && room.dailyDoubleWager > 0) {
          const player = room.players.find((item) => item.id === room.boardOwnerPlayerId);
          if (player) {
            player.score -= room.dailyDoubleWager;
          }
        }
        room.answerRevealed = true;
        room.buzzersOpen = false;
        broadcastRoom(room.roomCode);
        return;
      }

      if (room.firstBuzzedPlayerId) {
        // Deduct points
        if (room.selectedClueValue > 0) {
          const player = room.players.find((item) => item.id === room.firstBuzzedPlayerId);
          if (player) {
            player.score -= room.selectedClueValue;
          }
        }

        // Lock this player out for the rest of this clue
        if (!room.lockedOutPlayerIds.includes(room.firstBuzzedPlayerId)) {
          room.lockedOutPlayerIds.push(room.firstBuzzedPlayerId);
        }
      }

      room.firstBuzzedPlayerId = null;

      // Check if any eligible players remain — if not, just close buzzers
      const allLockedOut = room.players
        .filter((p) => p.isConnected !== false)
        .every((p) => room.lockedOutPlayerIds.includes(p.id));

      if (allLockedOut) {
        closeBuzzers(room);
      } else {
        openBuzzers(room);
      }

      broadcastRoom(room.roomCode);
      return;
    }

    if (message.type === "host:revealAnswer") {
      clearAnswerTimer(room);
      if (!room.answerRevealed) {
        if (room.isDailyDoubleActive) {
          // Daily double correct: award wager to board owner
          if (room.boardOwnerPlayerId && room.dailyDoubleWager > 0) {
            const player = room.players.find((item) => item.id === room.boardOwnerPlayerId);
            if (player) {
              player.score += room.dailyDoubleWager;
            }
          }
        } else if (room.firstBuzzedPlayerId && room.selectedClueValue > 0) {
          const player = room.players.find((item) => item.id === room.firstBuzzedPlayerId);
          if (player) {
            player.score += room.selectedClueValue;
            room.boardOwnerPlayerId = player.id;
          }
        }
      }

      room.answerRevealed = true;
      broadcastRoom(room.roomCode);
      return;
    }

    if (message.type === "host:closeClue") {
      clearAnswerTimer(room);
      const clueId = room.selectedClueId;
      if (clueId && !room.answeredClueIds.includes(clueId)) {
        room.answeredClueIds.push(clueId);
      }

      closeBuzzers(room);
      room.selectedClueId = null;
      room.selectedClueValue = 0;
      room.answerRevealed = false;
      room.clueLabel = "Select a clue";
      room.firstBuzzedPlayerId = null;
      room.lockedOutPlayerIds = [];
      room.isDailyDoubleActive = false;
      room.dailyDoubleWager = null;
      room.players = room.players.map((player) => ({ ...player, status: "locked" }));
      broadcastRoom(room.roomCode);
      return;
    }

    if (message.type === "host:updateBoardState") {
      const { roundLabel, clueLabel } = message.payload || {};
      if (typeof roundLabel === "string") {
        const prevLabel = room.roundLabel;
        room.roundLabel = roundLabel.slice(0, 40);
        // Clear revealed categories when switching rounds
        if (prevLabel !== room.roundLabel) {
          room.revealedCategoryIds = [];
        }
      }
      if (typeof clueLabel === "string") {
        room.clueLabel = clueLabel.slice(0, 80);
      }

      broadcastRoom(room.roomCode);
      return;
    }

    if (message.type === "host:revealCategory") {
      const { categoryId } = message.payload || {};
      if (typeof categoryId !== "string" || !categoryId.trim()) {
        sendError(client.ws, "Invalid category id");
        return;
      }
      if (!room.revealedCategoryIds.includes(categoryId)) {
        room.revealedCategoryIds.push(categoryId);
      }
      broadcastRoom(room.roomCode);
      return;
    }

    if (message.type === "host:startFinalJeopardy") {
      if (room.gamePhase !== "playing") {
        sendError(client.ws, "Final Jeopardy already started");
        return;
      }

      const { category, question, answer } = message.payload || {};
      if (!category || !question || !answer) {
        sendError(client.ws, "Invalid Final Jeopardy clue data");
        return;
      }

      // Close any active clue
      room.selectedClueId = null;
      room.selectedClueValue = 0;
      room.answerRevealed = false;
      room.buzzersOpen = false;
      room.firstBuzzedPlayerId = null;
      room.isDailyDoubleActive = false;
      room.dailyDoubleWager = null;

      room.gamePhase = "final-category";
      room.finalCategory = String(category).slice(0, 60);
      room._finalQuestion = String(question).slice(0, 300);
      room._finalAnswer = String(answer).slice(0, 120);
      room.finalAnswerShown = false;
      room._finalQuestionDeadlineMs = null;

      room.players = room.players.map((p) => ({
        ...p,
        status: "locked",
        finalWager: null,
        finalAnswer: null,
        finalAnswerDataUrl: null,
        finalAnswerRevealed: false,
        finalAnswerCorrect: null,
        finalRevealed: false,
      }));

      broadcastRoom(room.roomCode);
      return;
    }

    if (message.type === "host:revealFinalQuestion") {
      if (room.gamePhase !== "final-category") return;
      room.gamePhase = "final-question";
      room._finalQuestionDeadlineMs = Date.now() + 30000;
      broadcastRoom(room.roomCode);
      return;
    }

    if (message.type === "host:revealFinalAnswers") {
      if (room.gamePhase !== "final-question") return;
      room.gamePhase = "final-reveal";
      room._finalQuestionDeadlineMs = null;
      broadcastRoom(room.roomCode);
      return;
    }

    if (message.type === "host:showFinalAnswer") {
      if (room.gamePhase !== "final-reveal") return;
      room.finalAnswerShown = true;
      broadcastRoom(room.roomCode);
      return;
    }

    if (message.type === "host:revealFinalAnswer") {
      if (room.gamePhase !== "final-reveal") return;
      const { playerId } = message.payload || {};
      const player = room.players.find((p) => p.id === playerId);
      if (!player || player.finalAnswerRevealed) return;
      player.finalAnswerRevealed = true;
      broadcastRoom(room.roomCode);
      return;
    }

    if (message.type === "host:judgeFinalAnswer") {
      if (room.gamePhase !== "final-reveal") return;

      const { playerId, correct } = message.payload || {};
      const player = room.players.find((p) => p.id === playerId);
      if (!player || player.finalRevealed) return;

      const wager = typeof player.finalWager === "number" ? player.finalWager : 0;
      player.finalAnswerCorrect = Boolean(correct);
      player.finalAnswerRevealed = true;
      player.finalRevealed = true;
      player.score += correct ? wager : -wager;

      broadcastRoom(room.roomCode);
      return;
    }

    if (message.type === "host:endGame") {
      const endRoomCode = room.roomCode;
      for (const connectedId of room.connections) {
        const connected = clients.get(connectedId);
        if (connected) {
          connected.roomCode = null;
          connected.role = null;
          connected.playerId = null;
          sendError(connected.ws, "Room closed.");
        }
      }
      if (room._buzzerTimer != null) {
        clearTimeout(room._buzzerTimer);
        room._buzzerTimer = null;
      }
      clearAnswerTimer(room);
      rooms.delete(endRoomCode);
      return;
    }

    if (message.type === "host:restartGame") {
      // Reset game state but keep room, players, and connections
      room.gamePhase = "playing";
      room.roundLabel = "Round 1";
      room.clueLabel = "Select a clue";
      room.boardSeed = makeBoardSeed();
      room.answeredClueIds = [];
      room.revealedCategoryIds = [];
      room.selectedClueId = null;
      room.selectedClueValue = 0;
      room.answerRevealed = false;
      room.buzzersOpen = false;
      room.firstBuzzedPlayerId = null;
      room.lockedOutPlayerIds = [];
      room.isDailyDoubleActive = false;
      room.dailyDoubleWager = null;
      room.finalCategory = null;
      room._finalQuestion = null;
      room._finalAnswer = null;
      room.finalAnswerShown = false;
      room._finalQuestionDeadlineMs = null;
      room._buzzerDeadlineMs = null;
      clearAnswerTimer(room);
      closeBuzzers(room);

      room.players = room.players.map((p) => ({
        ...p,
        score: 0,
        status: "locked",
        finalWager: null,
        finalAnswer: null,
        finalAnswerDataUrl: null,
        finalAnswerRevealed: false,
        finalAnswerCorrect: null,
        finalRevealed: false,
      }));

      broadcastRoom(room.roomCode);
      return;
    }
  }

  function handleBoardControl(client, message) {
    const room = rooms.get(client.roomCode);
    if (!room || client.role !== "board") {
      sendError(client.ws, "Only board can perform this action");
      return;
    }

    if (message.type === "board:clueAnswered") {
      const clueId = String(message.payload?.clueId || "").trim();
      if (!clueId) {
        sendError(client.ws, "Invalid clue id");
        return;
      }

      if (!room.answeredClueIds.includes(clueId)) {
        room.answeredClueIds.push(clueId);
      }

      if (room.selectedClueId === clueId) {
        room.selectedClueId = null;
        room.selectedClueValue = 0;
        room.answerRevealed = false;
        room.clueLabel = "Select a clue";
        room.firstBuzzedPlayerId = null;
        room.buzzersOpen = false;
        room.players = room.players.map((player) => ({ ...player, status: "locked" }));
      }

      broadcastRoom(room.roomCode);
    }
  }

  const ANSWER_TIMER_MS = 5000;

  function clearAnswerTimer(room) {
    if (room._answerTimer != null) {
      clearTimeout(room._answerTimer);
      room._answerTimer = null;
    }
    room._answerDeadlineMs = null;
  }

  function handlePlayerBuzz(client) {
    const room = rooms.get(client.roomCode);
    if (!room || !client.playerId) {
      return;
    }

    if (!room.buzzersOpen || room.firstBuzzedPlayerId) {
      return;
    }

    if (room.lockedOutPlayerIds && room.lockedOutPlayerIds.includes(client.playerId)) {
      return;
    }

    // Cancel the auto-close timer — a player got in
    if (room._buzzerTimer != null) {
      clearTimeout(room._buzzerTimer);
      room._buzzerTimer = null;
    }

    room.firstBuzzedPlayerId = client.playerId;
    room.buzzersOpen = false;
    room.players = room.players.map((player) => ({
      ...player,
      status: player.id === client.playerId ? "buzzed" : "locked",
    }));

    // Start 5-second answer timer
    clearAnswerTimer(room);
    room._answerDeadlineMs = Date.now() + ANSWER_TIMER_MS;
    room._answerTimer = setTimeout(() => {
      clearAnswerTimer(room);
      if (!room.firstBuzzedPlayerId || room.answerRevealed) return;

      // Auto-mark incorrect: deduct points, lock player out, reopen for others
      const buzzedId = room.firstBuzzedPlayerId;
      if (room.selectedClueValue > 0) {
        const player = room.players.find((p) => p.id === buzzedId);
        if (player) player.score -= room.selectedClueValue;
      }
      if (!room.lockedOutPlayerIds.includes(buzzedId)) {
        room.lockedOutPlayerIds.push(buzzedId);
      }
      room.firstBuzzedPlayerId = null;

      const allLockedOut = room.players
        .filter((p) => p.isConnected !== false)
        .every((p) => room.lockedOutPlayerIds.includes(p.id));

      if (allLockedOut) {
        closeBuzzers(room);
      } else {
        openBuzzers(room);
      }

      broadcastRoom(room.roomCode);
    }, ANSWER_TIMER_MS);

    broadcastRoom(room.roomCode);
  }

  function closeRoom(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) {
      return;
    }

    if (room._buzzerTimer != null) {
      clearTimeout(room._buzzerTimer);
      room._buzzerTimer = null;
    }
    clearAnswerTimer(room);

    for (const connectedId of room.connections) {
      const connected = clients.get(connectedId);
      if (connected) {
        connected.roomCode = null;
        connected.role = null;
        connected.playerId = null;
        sendError(connected.ws, "Board disconnected. Room closed.");
      }
    }

    rooms.delete(roomCode);
  }

  function handleDisconnect(clientId) {
    const client = clients.get(clientId);
    if (!client) {
      return;
    }

    const { roomCode, role, playerId } = client;
    clients.delete(clientId);

    if (!roomCode) {
      return;
    }

    const room = rooms.get(roomCode);
    if (!room) {
      return;
    }

    room.connections.delete(clientId);

    if (role === "board") {
      // Keep the room alive so the board can reconnect (unless nobody else is in the room)
      if (room.connections.size === 0) {
        closeRoom(roomCode);
        return;
      }
      broadcastRoom(roomCode);
      return;
    }

    if (role === "host") {
      room.hostId = null;
      if (room.connections.size === 0) {
        closeRoom(roomCode);
        return;
      }
      broadcastRoom(roomCode);
      return;
    }

    if (role === "player" && playerId) {
      detachPlayerFromRoom(room, playerId);
      if (room.connections.size === 0) {
        closeRoom(roomCode);
        return;
      }
      broadcastRoom(roomCode);
    }
  }

  function leaveCurrentRoom(client) {
    if (!client.roomCode) {
      return;
    }

    const roomCode = client.roomCode;
    const room = rooms.get(roomCode);
    if (!room) {
      client.roomCode = null;
      client.role = null;
      client.playerId = null;
      return;
    }

    room.connections.delete(client.clientId);

    if (client.role === "board") {
      closeRoom(roomCode);
    }

    if (client.role === "host") {
      room.hostId = null;
      broadcastRoom(roomCode);
    }

    if (client.role === "player" && client.playerId) {
      detachPlayerFromRoom(room, client.playerId);
      broadcastRoom(roomCode);
    }

    client.roomCode = null;
    client.role = null;
    client.playerId = null;
  }

  function handleMessage(clientId, raw) {
    let message;

    try {
      message = JSON.parse(String(raw));
    } catch {
      const client = clients.get(clientId);
      if (client) {
        sendError(client.ws, "Invalid message format");
      }
      return;
    }

    const client = clients.get(clientId);
    if (!client || typeof message?.type !== "string") {
      return;
    }

    if (message.type === "board:createRoom") {
      const result = createRoomForBoard(clientId, message.payload || {});
      if (!result.ok) {
        sendError(client.ws, result.message);
      }
      return;
    }

    if (message.type === "board:rejoinRoom") {
      const roomCode = String(message.payload?.roomCode || "").toUpperCase().trim();
      const result = rejoinRoomAsBoard(clientId, roomCode);
      if (!result.ok) {
        sendError(client.ws, result.message);
      }
      return;
    }

    if (message.type === "board:ready") {
      const roomCode = client.roomCode;
      const room = rooms.get(roomCode);
      if (room) {
        room.boardIsReady = true;
        broadcastRoom(roomCode);
      }
      return;
    }

    if (message.type === "player:joinRoom") {
      const roomCode = String(message.payload?.roomCode || "").toUpperCase().trim();
      const name = String(message.payload?.playerName || "").trim();
      const result = joinRoomAsPlayer(clientId, roomCode, name, message.payload);
      if (!result.ok) {
        sendError(client.ws, result.message);
      }
      return;
    }

    if (message.type === "host:joinRoom") {
      const roomCode = String(message.payload?.roomCode || "").toUpperCase().trim();
      const result = joinRoomAsHost(clientId, roomCode);
      if (!result.ok) {
        sendError(client.ws, result.message);
      }
      return;
    }

    if (message.type === "session:leave") {
      leaveCurrentRoom(client);
      send(client.ws, "session:left", {});
      return;
    }

    if (message.type.startsWith("host:")) {
      handleHostControl(client, message);
      return;
    }

    if (message.type === "player:submitFinalWager") {
      const room = client.roomCode ? rooms.get(client.roomCode) : null;
      if (!room || !client.playerId || room.gamePhase !== "final-category") return;

      const player = room.players.find((p) => p.id === client.playerId);
      if (!player) return;

      const { wager } = message.payload || {};
      const maxWager = Math.max(player.score, 1000);
      const parsed = typeof wager === "number" ? Math.floor(wager) : -1;
      if (parsed < 0 || parsed > maxWager) {
        sendError(client.ws, "Invalid wager amount");
        return;
      }

      player.finalWager = parsed;
      broadcastRoom(room.roomCode);
      return;
    }

    if (message.type === "player:submitFinalAnswer") {
      const room = client.roomCode ? rooms.get(client.roomCode) : null;
      if (!room || !client.playerId || room.gamePhase !== "final-question") return;

      const player = room.players.find((p) => p.id === client.playerId);
      if (!player) return;

      const raw = String(message.payload?.answer || "").trim().slice(0, 120);
      player.finalAnswer = raw || "(no answer)";
      const rawDataUrl = String(message.payload?.finalAnswerDataUrl || "");
      player.finalAnswerDataUrl = rawDataUrl.startsWith("data:image/") && rawDataUrl.length < 65536
        ? rawDataUrl : null;
      broadcastRoom(room.roomCode);
      return;
    }

    if (message.type === "player:toggleNameDisplay") {
      const room = client.roomCode ? rooms.get(client.roomCode) : null;
      if (!room || !client.playerId) return;
      const player = room.players.find((p) => p.id === client.playerId);
      if (!player || !player.nameSignatureDataUrl) return;
      player.showNameSignature = !player.showNameSignature;
      broadcastRoom(room.roomCode);
      return;
    }

    if (message.type === "player:updateSignature") {
      const room = client.roomCode ? rooms.get(client.roomCode) : null;
      if (!room || !client.playerId) return;
      const player = room.players.find((p) => p.id === client.playerId);
      if (!player) return;
      const rawSig = String(message.payload?.nameSignatureDataUrl || "");
      player.nameSignatureDataUrl = rawSig.startsWith("data:image/") && rawSig.length < 65536
        ? rawSig : null;
      if (!player.nameSignatureDataUrl) {
        player.showNameSignature = false;
      }
      broadcastRoom(room.roomCode);
      return;
    }

    if (message.type === "player:buzz") {
      handlePlayerBuzz(client);
      return;
    }

    if (message.type.startsWith("board:")) {
      handleBoardControl(client, message);
    }
  }

  function connect(ws) {
    const clientId = randomId("client");
    clients.set(clientId, {
      clientId,
      ws,
      role: null,
      roomCode: null,
      playerId: null,
    });

    send(ws, "session:welcome", { clientId });
    ws.on("message", (raw) => handleMessage(clientId, raw));
    ws.on("close", () => handleDisconnect(clientId));

    return clientId;
  }

  return {
    connect,
    handleMessage,
    handleDisconnect,
    rooms,
    clients,
    toRoomState,
  };
}

module.exports = {
  createRoomServer,
  normalizeRequestedRoomCode,
};