import { useEffect, useMemo, useRef, useState } from "react";
import JoinLobby from "./components/JoinLobby";
import HostConsole from "./components/HostConsole";
import PlayerController from "./components/PlayerController";
import type { CompanionScreen, RoomState } from "./types";

const fallbackRoom: RoomState = {
  roomCode: "----",
  boardSeed: "fallback-seed",
  round1ExcludeClueIds: [],
  round2ExcludeClueIds: [],
  roundLabel: "Round 1",
  clueLabel: "Waiting for clue",
  isHostConnected: false,
  boardOwnerPlayerId: null,
  boardOwnerPlayerName: null,
  selectedClueId: null,
  selectedClueValue: 0,
  answerRevealed: false,
  answeredClueIds: [],
  revealedCategoryIds: [],
  buzzersOpen: false,
  lockedOutPlayerIds: [],
  firstBuzzedPlayerId: null,
  firstBuzzedPlayerName: null,
  isDailyDoubleActive: false,
  dailyDoubleWager: null,
  answerDeadlineMs: null,
  buzzerDeadlineMs: null,
  gamePhase: "playing",
  finalCategory: null,
  finalQuestion: null,
  finalAnswer: null,
  finalAnswerShown: false,
  finalQuestionDeadlineMs: null,
  customBoard: null,
  players: [],
};

function getWebSocketUrl() {
  const envUrl = import.meta.env.VITE_WS_URL;
  if (envUrl) {
    return envUrl;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws`;
}

// Credentials saved across reconnects so we can auto-rejoin
interface SessionCredentials {
  role: "host" | "player" | null;
  roomCode: string;
  playerName: string;
  playerId: string | null;
  nameSignatureDataUrl: string | null;
}

const MAX_RECONNECT_ATTEMPTS = 6;
const RECONNECT_BASE_MS = 500;

const App = () => {
  const socketRef = useRef<WebSocket | null>(null);
  const [screen, setScreen] = useState<CompanionScreen>("landing");
  const [playerName, setPlayerName] = useState("Contestant");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomState>(fallbackRoom);
  const [isConnected, setIsConnected] = useState(false);
  const [serverMessage, setServerMessage] = useState("Connecting to room server...");

  // Reconnection state
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef<SessionCredentials>({
    role: null, roomCode: "", playerName: "Contestant", playerId: null, nameSignatureDataUrl: null,
  });

  const currentPlayer = useMemo(() => room.players.find((player) => player.id === playerId) ?? null, [playerId, room.players]);

  const sendMessage = (type: string, payload: Record<string, unknown> = {}) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setServerMessage("Server is not connected yet.");
      return;
    }

    socket.send(JSON.stringify({ type, payload }));
  };

  const connectWebSocket = () => {
    const socket = new WebSocket(getWebSocketUrl());
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setIsConnected(true);
      reconnectAttemptRef.current = 0;
      const session = sessionRef.current;

      // Auto-rejoin if we had an active session
      if (session.role === "host" && session.roomCode) {
        setServerMessage(`Reconnecting to room ${session.roomCode} as host...`);
        socket.send(JSON.stringify({ type: "host:joinRoom", payload: { roomCode: session.roomCode } }));
      } else if (session.role === "player" && session.roomCode) {
        setServerMessage(`Reconnecting to room ${session.roomCode}...`);
        socket.send(JSON.stringify({
          type: "player:joinRoom",
          payload: {
            roomCode: session.roomCode,
            playerName: session.playerName,
            nameSignatureDataUrl: session.nameSignatureDataUrl,
          },
        }));
      } else {
        setServerMessage("Connected. Create or join a room.");
      }
    });

    socket.addEventListener("close", () => {
      setIsConnected(false);
      const session = sessionRef.current;
      const attempt = reconnectAttemptRef.current;

      // Only retry if we were in a room session
      if (session.role && attempt < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptRef.current += 1;
        const delayMs = Math.min(RECONNECT_BASE_MS * Math.pow(2, attempt), 16000);
        setServerMessage(`Connection lost. Reconnecting in ${Math.round(delayMs / 1000)}s… (${attempt + 1}/${MAX_RECONNECT_ATTEMPTS})`);
        reconnectTimerRef.current = setTimeout(() => connectWebSocket(), delayMs);
      } else if (session.role && attempt >= MAX_RECONNECT_ATTEMPTS) {
        setServerMessage("Could not reconnect. Please rejoin manually.");
        sessionRef.current = { role: null, roomCode: "", playerName: "Contestant", playerId: null, nameSignatureDataUrl: null };
      } else {
        setServerMessage("Disconnected from server. Refresh to reconnect.");
      }
    });

    socket.addEventListener("message", (event) => {
      let message: { type?: string; payload?: any; serverTimestamp?: number } = {};
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }

      if (message.type === "host:joined") {
        if (message.payload?.room) {
          setRoom(message.payload.room);
        }
        setScreen("host");
        setServerMessage(`Joined room ${message.payload?.roomCode ?? ""} as host.`);
        return;
      }

      if (message.type === "room:joined") {
        if (message.payload?.room) {
          setRoom(message.payload.room);
        }
        if (message.payload?.playerName) {
          setPlayerName(message.payload.playerName);
        }
        if (message.payload?.playerId) {
          setPlayerId(message.payload.playerId);
          sessionRef.current.playerId = message.payload.playerId;
        }
        setScreen("player");
        setServerMessage(`Joined room ${message.payload?.roomCode ?? ""}.`);
        return;
      }

      if (message.type === "room:state") {
        if (message.payload?.room) {
          const r = message.payload.room;
          if (message.serverTimestamp != null) {
            const off = message.serverTimestamp - Date.now();
            const adj = (d: number | null) => (d != null ? d - off : null);
            setRoom({ ...r, answerDeadlineMs: adj(r.answerDeadlineMs), buzzerDeadlineMs: adj(r.buzzerDeadlineMs), finalQuestionDeadlineMs: adj(r.finalQuestionDeadlineMs) });
          } else {
            setRoom(r);
          }
        }
        return;
      }

      if (message.type === "error") {
        const text = message.payload?.message || "Server error";
        setServerMessage(text);
        if (text.includes("Room closed")) {
          setScreen("landing");
          setRoom(fallbackRoom);
          setPlayerId(null);
          sessionRef.current = { role: null, roomCode: "", playerName: "Contestant", playerId: null, nameSignatureDataUrl: null };
        }
      }
    });
  };

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
    };
  }, []);

  const handleJoinAsHost = (roomCode: string) => {
    sessionRef.current = { role: "host", roomCode, playerName: "Host", playerId: null, nameSignatureDataUrl: null };
    sendMessage("host:joinRoom", { roomCode });
  };

  const handleJoinRoom = (nextRoomCode: string, nextPlayerName: string, nameSignatureDataUrl: string | null) => {
    const name = nextPlayerName || "Contestant";
    setPlayerName(name);
    sessionRef.current = { role: "player", roomCode: nextRoomCode, playerName: name, playerId: null, nameSignatureDataUrl };
    sendMessage("player:joinRoom", {
      roomCode: nextRoomCode,
      playerName: nextPlayerName,
      nameSignatureDataUrl,
    });
  };

  const selectClue = (clueId: string, clueLabel: string, roundLabel: string, clueValue: number, isDailyDouble?: boolean, buzzerDurationMs?: number) => {
    sendMessage("host:selectClue", {
      clueId,
      clueLabel,
      roundLabel,
      clueValue,
      ...(isDailyDouble && { isDailyDouble: true }),
      ...(typeof buzzerDurationMs === "number" && { buzzerDurationMs }),
    });
  };

  const setDailyDoubleWager = (wager: number) => {
    sendMessage("host:setDailyDoubleWager", { wager });
  };

  const revealAnswer = () => {
    sendMessage("host:revealAnswer");
  };

  const markIncorrect = () => {
    sendMessage("host:markIncorrect");
  };

  const updateScore = (playerId: string, delta: number) => {
    sendMessage("host:updateScore", { playerId, delta });
  };

  const closeClue = () => {
    sendMessage("host:closeClue");
  };

  const startFinalJeopardy = (category: string, question: string, answer: string) => {
    sendMessage("host:startFinalJeopardy", { category, question, answer });
  };

  const revealFinalQuestion = () => {
    sendMessage("host:revealFinalQuestion");
  };

  const revealFinalAnswers = () => {
    sendMessage("host:revealFinalAnswers");
  };

  const showFinalAnswer = () => {
    sendMessage("host:showFinalAnswer");
  };

  const revealFinalAnswer = (playerId: string) => {
    sendMessage("host:revealFinalAnswer", { playerId });
  };

  const judgeFinalAnswer = (playerId: string, correct: boolean) => {
    sendMessage("host:judgeFinalAnswer", { playerId, correct });
  };

  const endGame = () => {
    sendMessage("host:endGame");
  };

  const restartGame = () => {
    sendMessage("host:restartGame");
  };

  const revealCategory = (categoryId: string) => {
    sendMessage("host:revealCategory", { categoryId });
  };

  const openBuzzers = () => {
    sendMessage("host:setBuzzersOpen", { isOpen: true });
  };

  const submitFinalWager = (wager: number) => {
    sendMessage("player:submitFinalWager", { wager });
  };

  const submitFinalAnswer = (answer: string, finalAnswerDataUrl?: string | null) => {
    sendMessage("player:submitFinalAnswer", { answer, finalAnswerDataUrl: finalAnswerDataUrl ?? null });
  };

  const toggleNameDisplay = () => {
    sendMessage("player:toggleNameDisplay");
  };

  const updateSignature = (nameSignatureDataUrl: string | null) => {
    sendMessage("player:updateSignature", { nameSignatureDataUrl });
    sessionRef.current.nameSignatureDataUrl = nameSignatureDataUrl;
  };

  const markPlayerBuzzed = () => {
    sendMessage("player:buzz");
  };

  const leaveRoom = () => {
    sessionRef.current = { role: null, roomCode: "", playerName: "Contestant", playerId: null, nameSignatureDataUrl: null };
    sendMessage("session:leave");
    setScreen("landing");
    setPlayerId(null);
    setRoom(fallbackRoom);
  };

  return (
    <div className="companion-shell">
      <div className={`connection-banner ${isConnected ? "is-online" : "is-offline"}`}>
        {serverMessage}
      </div>

      {screen === "landing" && (
        <JoinLobby
          defaultRoomCode={room.roomCode === "----" ? "" : room.roomCode}
          onJoinAsHost={handleJoinAsHost}
          onJoinRoom={handleJoinRoom}
        />
      )}

      {screen === "host" && (
        <HostConsole
          room={room}
          onBack={leaveRoom}
          onSelectClue={selectClue}
          onSetDailyDoubleWager={setDailyDoubleWager}
          onRevealAnswer={revealAnswer}
          onMarkIncorrect={markIncorrect}
          onCloseClue={closeClue}
          onUpdateScore={updateScore}
          onStartFinalJeopardy={startFinalJeopardy}
          onRevealFinalQuestion={revealFinalQuestion}
          onRevealFinalAnswers={revealFinalAnswers}
          onShowFinalAnswer={showFinalAnswer}
          onRevealFinalAnswer={revealFinalAnswer}
          onJudgeFinalAnswer={judgeFinalAnswer}
          onEndGame={endGame}
          onRestartGame={restartGame}
          onRevealCategory={revealCategory}
          onOpenBuzzers={openBuzzers}
        />
      )}

      {screen === "player" && (
        <PlayerController
          room={room}
          playerId={playerId}
          playerName={playerName}
          playerStatus={currentPlayer?.status ?? null}
          onBack={leaveRoom}
          onBuzz={markPlayerBuzzed}
          onSubmitFinalWager={submitFinalWager}
          onSubmitFinalAnswer={submitFinalAnswer}
          onToggleNameDisplay={toggleNameDisplay}
          onUpdateSignature={updateSignature}
        />
      )}
    </div>
  );
};

export default App;