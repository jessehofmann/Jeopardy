import React, { useEffect, useMemo, useRef, useState } from "react";
import MainMenu from "./pages/MainMenu";
import Game from "./pages/Game";
import Lobby from "./pages/Lobby";
import HowToPlay from "./pages/HowToPlay";
import CustomBoardPage from "./pages/CustomBoardPage";
import type { RoomState } from "./types";
import { audio } from "./audio";
import "./styles/main.css";

type Page = "menu" | "lobby" | "game" | "customboard";
const CLUE_HISTORY_KEY = "jeopardy.clueHistory.v1";

function getRecentClueHistory() {
  try {
    const raw = localStorage.getItem(CLUE_HISTORY_KEY);
    if (!raw) {
      return { round1: [] as string[], round2: [] as string[] };
    }

    const parsed = JSON.parse(raw);
    return {
      round1: Array.isArray(parsed?.round1) ? parsed.round1.map((id) => String(id)) : [],
      round2: Array.isArray(parsed?.round2) ? parsed.round2.map((id) => String(id)) : [],
    };
  } catch {
    return { round1: [] as string[], round2: [] as string[] };
  }
}

const App: React.FC = () => {
  const [page, setPage] = useState<Page>("menu");
  const [roomCode, setRoomCode] = useState("");
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [startGameError, setStartGameError] = useState("");
  const [initialRoomState, setInitialRoomState] = useState<RoomState | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [pendingCustomBoard, setPendingCustomBoard] = useState<unknown>(null);
  const [lobbyRoomState, setLobbyRoomState] = useState<RoomState | null>(null);
  const boardSocketRef = useRef<WebSocket | null>(null);
  const lobbyListenerRef = useRef<((event: MessageEvent) => void) | null>(null);

  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleUnlockAudio = () => {
    setAudioUnlocked(true);
    audio.playTheme();
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    audio.setMuted(next);
    if (!next) {
      if (page === "menu" || page === "lobby") {
        audio.ensureThemePlaying();
      }
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    if (!audioUnlocked) return;
    if (page === "menu" || page === "lobby") {
      audio.ensureThemePlaying();
    } else {
      audio.stopTheme();
    }
  }, [page, audioUnlocked]);

  const wsUrl = useMemo(() => {
    const envUrl = import.meta.env.VITE_WS_URL;
    if (envUrl) {
      return envUrl;
    }

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.host}/ws`;
  }, []);

  const cleanupBoardSession = () => {
    if (lobbyListenerRef.current && boardSocketRef.current) {
      boardSocketRef.current.removeEventListener("message", lobbyListenerRef.current);
      lobbyListenerRef.current = null;
    }
    boardSocketRef.current?.close();
    boardSocketRef.current = null;
    setInitialRoomState(null);
    setLobbyRoomState(null);
    setRoomCode("");
    setIsStartingGame(false);
  };

  const handleStartGame = (nextRoomCode: string) => {
    const normalizedRoomCode = nextRoomCode.trim().toUpperCase();
    if (normalizedRoomCode.length !== 4) {
      setStartGameError("Enter a 4-character room code.");
      return;
    }

    cleanupBoardSession();
    setStartGameError("");
    setIsStartingGame(true);

    const socket = new WebSocket(wsUrl);

    const removeStartListeners = () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("close", handleClose);
    };

    const handleOpen = () => {
      const clueHistory = getRecentClueHistory();
      socket.send(
        JSON.stringify({
          type: "board:createRoom",
          payload: {
            roomCode: normalizedRoomCode,
            round1ExcludeClueIds: clueHistory.round1,
            round2ExcludeClueIds: clueHistory.round2,
            ...(pendingCustomBoard ? { customBoard: pendingCustomBoard } : {}),
          },
        })
      );
    };

    const handleMessage = (event: MessageEvent) => {
      let message: { type?: string; payload?: any } = {};
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }

      if (message.type === "board:roomCreated") {
        removeStartListeners();
        boardSocketRef.current = socket;
        const initialRoom: RoomState | null = message.payload?.room ?? null;
        setInitialRoomState(initialRoom);
        setLobbyRoomState(initialRoom);
        setRoomCode(message.payload?.roomCode ?? normalizedRoomCode);
        setIsStartingGame(false);

        // Listen for room:state updates during the lobby phase
        const lobbyListener = (event: MessageEvent) => {
          let msg: { type?: string; payload?: any } = {};
          try { msg = JSON.parse(String(event.data)); } catch { return; }
          if (msg.type === "room:state" && msg.payload?.room) {
            setLobbyRoomState(msg.payload.room);
            setInitialRoomState(msg.payload.room);
          }
        };
        lobbyListenerRef.current = lobbyListener;
        socket.addEventListener("message", lobbyListener);

        setPage("lobby");
        return;
      }

      if (message.type === "error") {
        removeStartListeners();
        setStartGameError(message.payload?.message || "Could not start room.");
        setIsStartingGame(false);
        socket.close();
      }
    };

    const handleClose = () => {
      removeStartListeners();
      if (!boardSocketRef.current) {
        setIsStartingGame(false);
      }
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("close", handleClose);
  };

  const handleBeginGame = () => {
    if (lobbyListenerRef.current && boardSocketRef.current) {
      boardSocketRef.current.removeEventListener("message", lobbyListenerRef.current);
      lobbyListenerRef.current = null;
    }
    boardSocketRef.current?.send(JSON.stringify({ type: "board:ready" }));
    setPage("game");
  };

  const handleRejoinGame = (nextRoomCode: string) => {
    const normalizedRoomCode = nextRoomCode.trim().toUpperCase();
    cleanupBoardSession();
    setIsStartingGame(true);
    setStartGameError("");

    const socket = new WebSocket(wsUrl);

    const removeListeners = () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("close", handleClose);
    };

    const handleOpen = () => {
      socket.send(JSON.stringify({ type: "board:rejoinRoom", payload: { roomCode: normalizedRoomCode } }));
    };

    const handleMessage = (event: MessageEvent) => {
      let message: { type?: string; payload?: any } = {};
      try { message = JSON.parse(String(event.data)); } catch { return; }

      if (message.type === "board:roomCreated") {
        removeListeners();
        boardSocketRef.current = socket;
        const room: RoomState | null = message.payload?.room ?? null;
        setInitialRoomState(room);
        setRoomCode(message.payload?.roomCode ?? normalizedRoomCode);
        setIsStartingGame(false);
        setPage("game");
        return;
      }
      if (message.type === "error") {
        removeListeners();
        setStartGameError(message.payload?.message || "Could not rejoin room.");
        setIsStartingGame(false);
        socket.close();
      }
    };

    const handleClose = () => {
      removeListeners();
      if (!boardSocketRef.current) setIsStartingGame(false);
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("close", handleClose);
  };

  const handleBackToMenu = () => {
    cleanupBoardSession();
    setStartGameError("");
    setPage("menu");
  };

  const pendingCustomBoardName = pendingCustomBoard
    ? ((pendingCustomBoard as any).name || "Custom Board") as string
    : null;

  return (
    <>
      {audioUnlocked && (
        <div className="top-right-controls">
          <button
            className={`top-ctrl-btn${muted ? " is-muted" : ""}`}
            onClick={handleToggleMute}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <button
            className={`top-ctrl-btn${isFullscreen ? " is-active" : ""}`}
            onClick={handleToggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            ⤢
          </button>
        </div>
      )}
      {!audioUnlocked && (
        <div className="audio-unlock-overlay" onClick={handleUnlockAudio}>
          <div className="audio-unlock-content">
            <img className="audio-unlock-logo" src="/assets/images/JeopardyLogo.png" alt="Jeopardy!" />
            <button className="audio-unlock-button">CLICK TO START</button>
          </div>
        </div>
      )}
      {page === "menu" && (
        <MainMenu
          onStartGame={handleStartGame}
          onRejoinGame={handleRejoinGame}
          onHowToPlay={() => setShowHowToPlay(true)}
          onCustomBoard={() => setPage("customboard")}
          pendingCustomBoardName={pendingCustomBoardName}
          isStartingGame={isStartingGame}
          startGameError={startGameError}
        />
      )}
      {page === "lobby" && lobbyRoomState && (
        <Lobby
          roomCode={roomCode}
          roomState={lobbyRoomState}
          onBegin={handleBeginGame}
        />
      )}
      {page === "game" && (
        <Game
          initialRoomCode={roomCode}
          initialRoomState={initialRoomState}
          boardSocket={boardSocketRef.current}
          onBackToMenu={handleBackToMenu}
        />
      )}
      {page === "customboard" && (
        <CustomBoardPage
          pendingBoardName={pendingCustomBoardName}
          onLoad={(raw) => { setPendingCustomBoard(raw); setPage("menu"); }}
          onClear={() => setPendingCustomBoard(null)}
          onBack={() => setPage("menu")}
        />
      )}
      {showHowToPlay && <HowToPlay onClose={() => setShowHowToPlay(false)} />}
    </>
  );
};

export default App;
