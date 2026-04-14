import React from "react";
import type { RoomState } from "../types";

interface LobbyProps {
  roomCode: string;
  roomState: RoomState;
  onBegin: () => void;
}

const Lobby: React.FC<LobbyProps> = ({ roomCode, roomState, onBegin }) => {
  const { players, isHostConnected } = roomState;
  const connectedPlayers = players.filter((p) => p.isConnected);
  const canBegin = isHostConnected && connectedPlayers.length >= 1;

  let statusMessage: string;
  if (!isHostConnected && connectedPlayers.length === 0) {
    statusMessage = "Waiting for host and at least 1 contestant to join…";
  } else if (!isHostConnected) {
    statusMessage = "Waiting for host to join…";
  } else if (connectedPlayers.length === 0) {
    statusMessage = "Waiting for at least 1 contestant to join…";
  } else {
    statusMessage = "Ready to begin!";
  }

  return (
    <div className="lobby-page">
      <div className="lobby-logo-container">
        <img
          className="jeopardy-logo-img"
          src="/assets/images/JeopardyLogo.png"
          alt="Jeopardy logo"
        />
      </div>

      <div className="lobby-room-code-block">
        <div className="lobby-room-code-label">ROOM CODE</div>
        <div className="lobby-room-code">{roomCode}</div>
        <div className="lobby-room-code-hint">
          Open <strong>jeopardy-companion.vercel.app</strong> and enter this code to join
        </div>
      </div>

      <div className="lobby-status-panel">
        <div className={`lobby-status-message ${canBegin ? "is-ready" : ""}`}>
          {statusMessage}
        </div>

        <div className="lobby-connections">
          <div className={`lobby-connection-row ${isHostConnected ? "is-connected" : ""}`}>
            <span className="lobby-connection-dot" />
            <span className="lobby-connection-label">Host</span>
            <span className="lobby-connection-state">{isHostConnected ? "Connected" : "Not joined"}</span>
          </div>

          <div className="lobby-contestants-header">
            <span className="lobby-connection-label">Contestants</span>
            <span className="lobby-contestants-count">{connectedPlayers.length}</span>
          </div>

          {connectedPlayers.length > 0 && (
            <ul className="lobby-player-list">
              {connectedPlayers.map((p) => (
                <li key={p.id} className="lobby-player-item">
                  <span className="lobby-connection-dot is-connected" />
                  {p.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <button className="menu-button lobby-begin-btn" disabled={!canBegin} onClick={onBegin}>
        BEGIN GAME
      </button>
    </div>
  );
};

export default Lobby;
