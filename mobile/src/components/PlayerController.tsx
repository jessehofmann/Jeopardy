import { useEffect, useMemo, useRef, useState } from "react";
import type { RoomState } from "../types";
import SignaturePad from "./SignaturePad";
import Icon from "./Icon";

const ordinalPlace = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const vibrate = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported / blocked — no-op */
  }
};

interface PlayerControllerProps {
  room: RoomState;
  playerId: string | null;
  playerName: string;
  playerStatus: "ready" | "buzzed" | "locked" | null;
  onBack: () => void;
  onBuzz: () => void;
  onSubmitFinalWager: (wager: number) => void;
  onSubmitFinalAnswer: (answer: string, dataUrl?: string | null) => void;
  onToggleNameDisplay?: () => void;
  onUpdateSignature?: (dataUrl: string | null) => void;
  onUpdateName?: (name: string) => void;
}

const PlayerController = ({
  room,
  playerId,
  playerName,
  playerStatus,
  onBack,
  onBuzz,
  onSubmitFinalWager,
  onSubmitFinalAnswer,
  onToggleNameDisplay,
  onUpdateSignature,
  onUpdateName,
}: PlayerControllerProps) => {
  // Optimistic buzz: flip the button the instant it's tapped, before the
  // server round-trip confirms, so feedback doesn't depend on latency.
  const [optimisticBuzz, setOptimisticBuzz] = useState(false);
  const hasBuzzed = playerStatus === "buzzed" || optimisticBuzz;
  const isLockedOut = Boolean(playerId && room.lockedOutPlayerIds?.includes(playerId));
  const isLocked = !room.buzzersOpen || isLockedOut;
  const [showSettings, setShowSettings] = useState(false);
  const prevBuzzersOpenRef = useRef(room.buzzersOpen);
  const myPlayer = useMemo(
    () => room.players.find((p) => p.id === playerId) ?? null,
    [room.players, playerId]
  );

  // Wager state
  const maxWager = Math.max(myPlayer?.score ?? 0, 1000);
  const [wagerInput, setWagerInput] = useState<string>("");
  const [wagerLocked, setWagerLocked] = useState(false);
  const parsedWager = parseInt(wagerInput, 10);
  const isWagerValid = !isNaN(parsedWager) && parsedWager >= 0 && parsedWager <= maxWager;

  // Answer state
  const [answerMode, setAnswerMode] = useState<"type" | "draw">("type");
  const [answerInput, setAnswerInput] = useState<string>("");
  const [answerDataUrl, setAnswerDataUrl] = useState<string | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);

  // Name change state
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [newSigDataUrl, setNewSigDataUrl] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState(playerName);
  useEffect(() => { setNameInput(playerName); }, [playerName]);

  // Score-change feedback: flash + haptic the moment the host's ruling lands.
  const prevScoreRef = useRef<number | null>(null);
  const [scoreFlash, setScoreFlash] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    const score = myPlayer?.score;
    if (score == null) return;
    const prev = prevScoreRef.current;
    prevScoreRef.current = score;
    if (prev == null || score === prev) return;
    const dir = score > prev ? "up" : "down";
    setScoreFlash(dir);
    vibrate(dir === "up" ? [0, 25, 40, 25] : 120);
    const t = setTimeout(() => setScoreFlash(null), 1200);
    return () => clearTimeout(t);
  }, [myPlayer?.score]);

  // Countdown timer driven by server deadline
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    const deadline = room.finalQuestionDeadlineMs;
    if (room.gamePhase !== "final-question" || !deadline) {
      setTimeLeft(30);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [room.gamePhase, room.finalQuestionDeadlineMs]);

  // Reset local state when phase changes
  useEffect(() => {
    setWagerLocked(false);
    setWagerInput("");
    setAnswerMode("type");
    setAnswerInput("");
    setAnswerDataUrl(null);
    setAnswerSubmitted(false);
  }, [room.gamePhase]);

  // Sync wager lock state from server
  useEffect(() => {
    if (myPlayer?.finalWager != null) {
      setWagerLocked(true);
    }
  }, [myPlayer?.finalWager]);

  // Clear the optimistic buzz once the server catches up (or the clue moves on).
  useEffect(() => {
    if (playerStatus === "buzzed" || !room.buzzersOpen || isLockedOut) {
      setOptimisticBuzz(false);
    }
  }, [playerStatus, room.buzzersOpen, isLockedOut]);

  // Light haptic pulse the moment buzzers open, so heads-down players feel it.
  useEffect(() => {
    const was = prevBuzzersOpenRef.current;
    prevBuzzersOpenRef.current = room.buzzersOpen;
    if (!was && room.buzzersOpen && !isLockedOut && !room.isDailyDoubleActive) {
      vibrate(40);
    }
  }, [room.buzzersOpen, isLockedOut, room.isDailyDoubleActive]);

  const handleBuzz = () => {
    if (hasBuzzed || isLocked) return;
    setOptimisticBuzz(true);
    vibrate([0, 30, 20, 30]);
    onBuzz();
  };

  const statusText = useMemo(() => {
    if (room.isDailyDoubleActive) return "Daily Double! The board owner is answering.";
    if (isLockedOut) return "You answered incorrectly — locked out until the next clue.";
    if (hasBuzzed) return "Buzz sent. Wait for the host to call on you.";
    if (!room.buzzersOpen) {
      return room.selectedClueId && !room.answerRevealed
        ? "Get ready — buzzers open any second."
        : "Host has the buzzers locked.";
    }
    return "Buzzers are open. Tap as soon as you know it.";
  }, [hasBuzzed, isLockedOut, room.buzzersOpen, room.isDailyDoubleActive, room.selectedClueId, room.answerRevealed]);

  const getReady = Boolean(
    room.selectedClueId && !room.buzzersOpen && !room.answerRevealed &&
    !hasBuzzed && !isLockedOut && !room.isDailyDoubleActive
  );

  const myRank = useMemo(() => {
    const active = room.players.filter((p) => !p.isRemoved).sort((a, b) => b.score - a.score);
    const idx = active.findIndex((p) => p.id === playerId);
    return idx >= 0 && active.length > 1 ? { place: idx + 1, of: active.length } : null;
  }, [room.players, playerId]);

  const handleLockWager = () => {
    if (!isWagerValid) return;
    onSubmitFinalWager(parsedWager);
    setWagerLocked(true);
  };

  const handleSubmitAnswer = () => {
    if (answerMode === "draw") {
      onSubmitFinalAnswer("(drawn)", answerDataUrl);
    } else {
      const trimmed = answerInput.trim();
      onSubmitFinalAnswer(trimmed || "(no answer)", null);
    }
    setAnswerSubmitted(true);
  };

  const handleSaveSignature = () => {
    if (!newSigDataUrl) return;
    onUpdateSignature?.(newSigDataUrl);
    setShowNameEdit(false);
    setNewSigDataUrl(null);
  };

  const canSubmitAnswer = answerMode === "type"
    ? answerInput.trim().length > 0
    : answerDataUrl !== null;

  const showingSig = Boolean(myPlayer?.showNameSignature && myPlayer?.nameSignatureDataUrl);

  return (
    <main className="player-layout">
      <header className="player-header">
        <button className="ghost-action" onClick={onBack}>Leave</button>
        <div className="room-badge">Room {room.roomCode}</div>
        {room.gamePhase === "playing" && (onToggleNameDisplay || onUpdateSignature || onUpdateName) && (
          <button
            className="ghost-action player-settings-btn"
            onClick={() => setShowSettings(true)}
            aria-label="Name settings"
          >
            <Icon name="settings" size={18} />
          </button>
        )}
      </header>

      {/* ── Name / signature settings sheet ── */}
      {showSettings && (
        <div className="name-edit-overlay" onClick={() => setShowSettings(false)}>
          <div className="name-edit-card" onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow" style={{ marginBottom: 12 }}>Your Name</p>
            {onUpdateName && (
              <form
                className="player-rename-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  const next = nameInput.trim();
                  if (next && next !== playerName) onUpdateName(next);
                  setShowSettings(false);
                }}
              >
                <input
                  className="player-name-input"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={20}
                  aria-label="Display name"
                />
                <button
                  className="primary-action"
                  type="submit"
                  disabled={!nameInput.trim() || nameInput.trim() === playerName}
                >
                  Save
                </button>
              </form>
            )}
            {myPlayer?.nameSignatureDataUrl && onToggleNameDisplay && (
              <button className="name-display-toggle" onClick={onToggleNameDisplay} type="button">
                {myPlayer.showNameSignature ? "Show typed name on the board" : "Show signature on the board"}
              </button>
            )}
            {onUpdateSignature && (
              <button
                className="name-edit-btn"
                onClick={() => { setShowSettings(false); setShowNameEdit(true); }}
                type="button"
              >
                {myPlayer?.nameSignatureDataUrl ? "Change Signature" : "Add Signature"}
              </button>
            )}
            <button
              className="ghost-action"
              style={{ marginTop: 8 }}
              onClick={() => setShowSettings(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── Name signature editor overlay ── */}
      {showNameEdit && (
        <div className="name-edit-overlay">
          <div className="name-edit-card">
            <p className="eyebrow" style={{ marginBottom: 8 }}>Update Your Signature</p>
            <SignaturePad onChange={setNewSigDataUrl} label="Sign your name" />
            <div className="name-edit-actions">
              <button
                className="primary-action"
                disabled={!newSigDataUrl}
                onClick={handleSaveSignature}
              >
                Save
              </button>
              <button
                className="ghost-action"
                onClick={() => { setShowNameEdit(false); setNewSigDataUrl(null); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Regular buzzer view ── */}
      {room.gamePhase === "playing" && (
        <section className={`player-card${room.buzzersOpen || hasBuzzed ? " is-live" : ""}`}>
          <p className="eyebrow">You are playing as</p>
          {(onUpdateName || onUpdateSignature || onToggleNameDisplay) ? (
            <button
              type="button"
              className="player-name-display"
              onClick={() => setShowSettings(true)}
              aria-label="Edit your name"
            >
              {showingSig ? (
                <img
                  src={myPlayer!.nameSignatureDataUrl!}
                  className="player-name-sig"
                  alt={playerName}
                />
              ) : (
                <h1>{playerName}</h1>
              )}
              <span className="player-name-edit-hint">
                <Icon name="edit" size={13} /> Edit
              </span>
            </button>
          ) : showingSig ? (
            <img src={myPlayer!.nameSignatureDataUrl!} className="player-name-sig" alt={playerName} />
          ) : (
            <h1>{playerName}</h1>
          )}
          {myPlayer?.nameSignatureDataUrl && onToggleNameDisplay && (
            <button
              type="button"
              className="player-name-swap"
              onClick={onToggleNameDisplay}
            >
              <Icon name="swap" size={13} />
              {myPlayer.showNameSignature ? "Show typed name" : "Show signature"}
            </button>
          )}
          <div className={`player-score-display${scoreFlash ? ` flash-${scoreFlash}` : ""}`}>
            <span className="player-score-label">Score</span>
            <span className="player-score-value">
              {myPlayer != null
                ? myPlayer.score < 0
                  ? `-$${Math.abs(myPlayer.score).toLocaleString()}`
                  : `$${myPlayer.score.toLocaleString()}`
                : "$0"}
            </span>
          </div>
          {myRank && (
            <p className="player-rank-line">{ordinalPlace(myRank.place)} of {myRank.of}</p>
          )}
          {room.selectedClueValue > 0 && !room.answerRevealed && (
            <p className="player-clue-value">${room.selectedClueValue.toLocaleString()} clue in play</p>
          )}
          <p className="player-status-copy" aria-live="polite">{statusText}</p>
          <div className={`buzzer-wrapper${!hasBuzzed && !isLocked ? " is-active" : ""}${hasBuzzed ? " is-buzzed" : ""}${isLockedOut ? " is-locked-out" : ""}${getReady ? " is-get-ready" : ""}`}>
            <button
              className={`buzzer-button${hasBuzzed || isLocked ? " is-disabled" : ""}${isLockedOut ? " is-locked-out" : ""}`}
              disabled={hasBuzzed || isLocked}
              onClick={handleBuzz}
            >
              {hasBuzzed ? "BUZZED!" : isLockedOut ? "LOCKED OUT" : getReady ? "GET READY" : "BUZZ IN"}
            </button>
          </div>
          {(hasBuzzed || room.buzzersOpen) && !isLockedOut && (
            <p className="player-question-reminder">Answer in the form of a question</p>
          )}
          <div className="player-meta">
            <div>
              <span className="meta-label">Round</span>
              <strong>{room.roundLabel}</strong>
            </div>
            <div>
              <span className="meta-label">Board Owner</span>
              <strong>{room.boardOwnerPlayerName ?? "Unassigned"}</strong>
            </div>
          </div>
        </section>
      )}

      {/* ── Final Jeopardy: wagering ── */}
      {room.gamePhase === "final-category" && (
        <section className="player-card player-fj-card">
          <p className="eyebrow player-fj-eyebrow">Final Jeopardy</p>
          <h2 className="player-fj-category">{room.finalCategory}</h2>

          {!wagerLocked ? (
            <div className="player-fj-wager-section">
              <p className="player-fj-instruction">
                You have <strong>${myPlayer?.score?.toLocaleString() ?? 0}</strong>.
                How much will you wager?
              </p>
              <p className="player-fj-range">$0 – ${maxWager.toLocaleString()}</p>
              <input
                className="player-fj-input"
                type="number"
                min={0}
                max={maxWager}
                value={wagerInput}
                onChange={(e) => setWagerInput(e.target.value)}
                placeholder="Enter wager"
              />
              <button
                className="primary-action player-fj-submit"
                disabled={!isWagerValid}
                onClick={handleLockWager}
              >
                Lock In Wager
              </button>
            </div>
          ) : (
            <div className="player-fj-locked">
              <p className="player-fj-locked-label">Wager locked in!</p>
              <p className="player-fj-locked-amount">
                ${(myPlayer?.finalWager ?? parsedWager).toLocaleString()}
              </p>
              <p className="player-fj-instruction">Wait for the host to reveal the question.</p>
              <button
                className="ghost-action"
                type="button"
                onClick={() => {
                  setWagerInput(String(myPlayer?.finalWager ?? parsedWager));
                  setWagerLocked(false);
                }}
              >
                Edit wager
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Final Jeopardy: answering ── */}
      {room.gamePhase === "final-question" && (
        <section className="player-card player-fj-card">
          <div className={`player-fj-timer ${timeLeft <= 5 ? "is-urgent" : ""}`}>
            {timeLeft}
          </div>
          <p className="player-fj-question">{room.finalQuestion}</p>

          {!answerSubmitted ? (
            <div className="player-fj-answer-section">
              <div className="fj-answer-tabs">
                <button
                  className={`fj-answer-tab ${answerMode === "type" ? "is-active" : ""}`}
                  onClick={() => setAnswerMode("type")}
                  type="button"
                >
                  Type
                </button>
                <button
                  className={`fj-answer-tab ${answerMode === "draw" ? "is-active" : ""}`}
                  onClick={() => setAnswerMode("draw")}
                  type="button"
                >
                  Handwrite
                </button>
              </div>

              {answerMode === "type" ? (
                <textarea
                  className="player-fj-textarea"
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  placeholder="What is..."
                  rows={2}
                  disabled={timeLeft === 0}
                />
              ) : (
                <SignaturePad
                  onChange={setAnswerDataUrl}
                  label="Write your answer"
                />
              )}

              <button
                className="primary-action player-fj-submit"
                onClick={handleSubmitAnswer}
                disabled={timeLeft === 0 || !canSubmitAnswer}
              >
                {timeLeft === 0 ? "Time's Up!" : "Submit Answer"}
              </button>
            </div>
          ) : (
            <div className="player-fj-locked">
              <p className="player-fj-locked-label">Answer submitted!</p>
              {answerMode === "draw" && answerDataUrl ? (
                <img src={answerDataUrl} className="player-fj-answer-preview" alt="Your answer" />
              ) : (
                <p className="player-fj-locked-amount">{answerInput || "(no answer)"}</p>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── Final Jeopardy: reveal ── */}
      {(room.gamePhase === "final-reveal" || room.gamePhase === "game-over") && (
        <section className="player-card player-fj-card">
          <p className="eyebrow player-fj-eyebrow">Final Jeopardy</p>
          <h2 className="player-fj-category">{room.finalCategory}</h2>

          {myPlayer?.finalRevealed ? (
            <div className={`player-fj-result ${myPlayer.finalAnswerCorrect ? "is-correct" : "is-incorrect"}`}>
              <div className="player-fj-result-badge">
                {myPlayer.finalAnswerCorrect ? "Correct!" : "Incorrect"}
              </div>
              <p className="player-fj-result-answer">
                Your answer: <strong>{myPlayer.finalAnswer ?? "(no answer)"}</strong>
              </p>
              <p className="player-fj-result-change">
                {myPlayer.finalAnswerCorrect
                  ? `+$${(myPlayer.finalWager ?? 0).toLocaleString()}`
                  : `−$${(myPlayer.finalWager ?? 0).toLocaleString()}`}
              </p>
              <p className="player-fj-result-total">
                Final score: <strong>
                  {myPlayer.score < 0
                    ? `-$${Math.abs(myPlayer.score).toLocaleString()}`
                    : `$${myPlayer.score.toLocaleString()}`}
                </strong>
              </p>
            </div>
          ) : (
            <div className="player-fj-locked">
              <p className="player-fj-instruction">Waiting for your answer to be revealed...</p>
            </div>
          )}

          {room.players.some((p) => p.finalRevealed) && (
            <div className="player-fj-standings">
              {[...room.players]
                .filter((p) => !p.isRemoved)
                .sort((a, b) => b.score - a.score)
                .map((p, i) => (
                  <div
                    key={p.id}
                    className={`player-fj-standing${p.id === playerId ? " is-me" : ""}`}
                  >
                    <span className="player-fj-standing-rank">{i + 1}</span>
                    <span className="player-fj-standing-name">{p.name}</span>
                    <span className="player-fj-standing-score">
                      {p.score < 0
                        ? `-$${Math.abs(p.score).toLocaleString()}`
                        : `$${p.score.toLocaleString()}`}
                      {p.finalRevealed ? "" : " …"}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
};

export default PlayerController;
