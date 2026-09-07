import React, { useEffect, useState } from "react";

interface MainMenuProps {
  onStartGame: (roomCode: string) => void;
  onRejoinGame: (roomCode: string) => void;
  onHowToPlay: () => void;
  onCustomBoard: () => void;
  pendingCustomBoardName: string | null;
  isStartingGame: boolean;
  startGameError: string;
  apiBase: string;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStartGame, onRejoinGame, onHowToPlay, onCustomBoard, pendingCustomBoardName, isStartingGame, startGameError, apiBase }) => {
  const [roomCode, setRoomCode] = useState("");
  const [roomExists, setRoomExists] = useState(false);
  const normalizedRoomCode = roomCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  const canAct = normalizedRoomCode.length === 4 && !isStartingGame;
  const isRejoin = roomExists || startGameError === "That room code is already in use";

  useEffect(() => {
    setRoomExists(false);
    if (normalizedRoomCode.length !== 4) return;
    const controller = new AbortController();
    fetch(`${apiBase}/rooms/${normalizedRoomCode}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setRoomExists(Boolean(data?.exists)))
      .catch(() => {});
    return () => controller.abort();
  }, [normalizedRoomCode, apiBase]);

  return (
    <div className="main-menu">
      <div className="logo-container">
        <img
          className="jeopardy-logo-img"
          src="/assets/images/JeopardyLogo.png"
          alt="Jeopardy logo"
        />
      </div>
      <div className="menu-room-panel">
        <label className="menu-room-label" htmlFor="menu-room-code">
          Room Code Required For New Game
        </label>
        <input
          id="menu-room-code"
          className="menu-room-input"
          value={normalizedRoomCode}
          onChange={(event) => setRoomCode(event.target.value)}
          placeholder="ABCD"
          maxLength={4}
        />
        {startGameError && <div className="menu-room-status is-error">{startGameError}</div>}
        {isStartingGame && <div className="menu-room-status">Starting room...</div>}
      </div>
      <div className="menu-buttons">
        {isRejoin ? (
          <button className="menu-button rejoin" disabled={!canAct} onClick={() => onRejoinGame(normalizedRoomCode)}>
            {isStartingGame ? "REJOINING..." : "REJOIN GAME"}
          </button>
        ) : (
          <button className="menu-button" disabled={!canAct} onClick={() => onStartGame(normalizedRoomCode)}>
            {isStartingGame ? "STARTING..." : "NEW GAME"}
          </button>
        )}
        <button
          className={`menu-button secondary${pendingCustomBoardName ? " is-active" : ""}`}
          onClick={onCustomBoard}
        >
          {pendingCustomBoardName ? `BOARD: ${pendingCustomBoardName.toUpperCase()}` : "CUSTOM BOARD"}
        </button>
        <button className="menu-button secondary" onClick={onHowToPlay}>
          HOW TO PLAY
        </button>
      </div>
    </div>
  );
};

export default MainMenu;
