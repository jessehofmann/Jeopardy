import { useState } from "react";
import SignaturePad from "./SignaturePad";

interface JoinLobbyProps {
  defaultRoomCode: string;
  onJoinAsHost: (roomCode: string) => void;
  onJoinRoom: (roomCode: string, playerName: string, nameSignatureDataUrl: string | null) => void;
}

const JoinLobby = ({ defaultRoomCode, onJoinAsHost, onJoinRoom }: JoinLobbyProps) => {
  const [roomCode, setRoomCode] = useState(defaultRoomCode);
  const [playerName, setPlayerName] = useState("");
  const [nameSignature, setNameSignature] = useState<string | null>(null);
  const [hostRoomCode, setHostRoomCode] = useState("");

  const canJoin = roomCode.trim().length === 4 && playerName.trim().length > 0 && nameSignature !== null;

  return (
    <main className="landing-layout">
      <section className="join-card">
        <div className="join-header">
          <h2>Enter Room</h2>
          <p>Enter the room code and your name, then sign to join.</p>
        </div>

        <label className="field-label" htmlFor="room-code">Room Code</label>
        <input
          id="room-code"
          className="room-code-input"
          maxLength={4}
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          placeholder="ABCD"
        />

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
          label="Sign your name to join"
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
          maxLength={4}
          value={hostRoomCode}
          onChange={(e) => setHostRoomCode(e.target.value.toUpperCase())}
          placeholder="ABCD"
        />
        <div className="hero-actions">
          <button
            className="primary-action"
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
