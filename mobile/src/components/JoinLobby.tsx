import { useState } from "react";
import SignaturePad from "./SignaturePad";
import { BOARD_URL } from "../config";

interface JoinLobbyProps {
  defaultRoomCode: string;
  onJoinAsHost: (roomCode: string) => void;
  onJoinRoom: (roomCode: string, playerName: string, nameSignatureDataUrl: string | null) => void;
}

const JoinLobby = ({ defaultRoomCode, onJoinAsHost, onJoinRoom }: JoinLobbyProps) => {
  // Room codes are drawn from an alphabet with no O/I/0/1 (they read ambiguously).
  const cleanCode = (v: string) =>
    v.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 4);
  const hadAmbiguous = (v: string) => /[OI01]/i.test(v);

  const [codeHint, setCodeHint] = useState(false);
  const [roomCode, setRoomCode] = useState(cleanCode(defaultRoomCode));
  const [playerName, setPlayerName] = useState("");
  const [nameSignature, setNameSignature] = useState<string | null>(null);
  const [hostRoomCode, setHostRoomCode] = useState("");

  const canJoin = roomCode.trim().length === 4 && playerName.trim().length > 0;

  return (
    <main className="landing-layout">
      <section className="join-card">
        <div className="join-header">
          <h2>Enter Room</h2>
          <p>Enter the room code and your name, then sign to join.</p>
          <div className="join-board-link">
            Board: <a href={BOARD_URL.startsWith("http") ? BOARD_URL : `https://${BOARD_URL}`} target="_blank" rel="noopener noreferrer" className="join-board-url">{BOARD_URL}</a>
          </div>
        </div>

        <label className="field-label" htmlFor="room-code">Room Code</label>
        <input
          id="room-code"
          className="room-code-input"
          inputMode="text"
          autoCapitalize="characters"
          maxLength={4}
          value={roomCode}
          onChange={(e) => {
            setCodeHint(hadAmbiguous(e.target.value));
            setRoomCode(cleanCode(e.target.value));
          }}
          placeholder="ABCD"
        />
        {codeHint && (
          <p className="join-code-hint">Room codes never use the letters O or I, or the digits 0 or 1.</p>
        )}

        <label className="field-label" htmlFor="player-name">Your Name</label>
        <input
          id="player-name"
          className="player-name-input"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Contestant"
          maxLength={20}
        />

        <SignaturePad
          label="Sign your name (optional)"
          onChange={setNameSignature}
        />

        <button
          className="join-action"
          disabled={!canJoin}
          onClick={() => onJoinRoom(roomCode || defaultRoomCode, playerName || "Contestant", nameSignature)}
        >
          Join Room
        </button>
      </section>

      <section className="hero-card">
        <p className="eyebrow">Hosting?</p>
        <h1>Enter the room code from the board to take host control.</h1>
        <p className="hero-copy">
          Start the game from the web board — it will display a code. Enter it here to control scoring, buzzers, and clue selection from your phone.
        </p>
        <label className="field-label" htmlFor="host-room-code">Room Code</label>
        <input
          id="host-room-code"
          className="room-code-input"
          autoCapitalize="characters"
          maxLength={4}
          value={hostRoomCode}
          onChange={(e) => setHostRoomCode(cleanCode(e.target.value))}
          placeholder="ABCD"
        />
        <div className="hero-actions">
          <button
            className="primary-action"
            disabled={hostRoomCode.length !== 4}
            onClick={() => onJoinAsHost(hostRoomCode)}
          >
            Join as Host
          </button>
        </div>
      </section>
    </main>
  );
};

export default JoinLobby;
