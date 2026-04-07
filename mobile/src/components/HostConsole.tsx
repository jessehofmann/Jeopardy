import { useEffect, useMemo, useState } from "react";
import type { Clue, RoomState } from "../types";
import { generateGameCatalogs, pickFinalJeopardyClue } from "../data/clueCatalog";

type DraftClue = {
  categoryName: string;
  clue: Clue;
};

interface HostConsoleProps {
  room: RoomState;
  onBack: () => void;
  onSelectClue: (clueId: string, clueLabel: string, roundLabel: string, clueValue: number, isDailyDouble?: boolean, buzzerDurationMs?: number) => void;
  onSetDailyDoubleWager: (wager: number) => void;
  onRevealAnswer: () => void;
  onMarkIncorrect: () => void;
  onCloseClue: () => void;
  onUpdateScore: (playerId: string, delta: number) => void;
  onStartFinalJeopardy: (category: string, question: string, answer: string) => void;
  onRevealFinalQuestion: () => void;
  onRevealFinalAnswers: () => void;
  onShowFinalAnswer: () => void;
  onRevealFinalAnswer: (playerId: string) => void;
  onJudgeFinalAnswer: (playerId: string, correct: boolean) => void;
  onEndGame: () => void;
  onRevealCategory: (categoryId: string) => void;
  onOpenBuzzers: () => void;
}

const HostConsole = ({
  room,
  onBack,
  onSelectClue,
  onSetDailyDoubleWager,
  onRevealAnswer,
  onMarkIncorrect,
  onCloseClue,
  onUpdateScore,
  onStartFinalJeopardy,
  onRevealFinalQuestion,
  onRevealFinalAnswers,
  onShowFinalAnswer,
  onRevealFinalAnswer,
  onJudgeFinalAnswer,
  onEndGame,
  onRevealCategory,
  onOpenBuzzers,
}: HostConsoleProps) => {
  const isInFinalJeopardy = room.gamePhase !== "playing";
  const isRoundTwo = room.roundLabel.toLowerCase().includes("double") || room.roundLabel.toLowerCase().includes("round 2");
  const seed = room.boardSeed?.trim() || room.roomCode?.trim() || "default-room";
  const catalogs = useMemo(
    () =>
      generateGameCatalogs({
        seed,
        categoryCount: 6,
        round1ExcludeClueIds: room.round1ExcludeClueIds,
        round2ExcludeClueIds: room.round2ExcludeClueIds,
      }),
    [seed, room.round1ExcludeClueIds, room.round2ExcludeClueIds]
  );
  const catalog = useMemo(() => {
    if (room.customBoard) {
      return isRoundTwo ? (room.customBoard.round2 ?? room.customBoard.round1) : room.customBoard.round1;
    }
    return isRoundTwo ? catalogs.round2 : catalogs.round1;
  }, [room.customBoard, isRoundTwo, catalogs]);
  const roundLabel = isRoundTwo ? "Round 2 - Double Jeopardy" : "Round 1";
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(catalog[0]?.id ?? "");
  const [draftClue, setDraftClue] = useState<DraftClue | null>(null);
  const [wagerInput, setWagerInput] = useState<string>("");
  const [buzzerTimerSeconds, setBuzzerTimerSeconds] = useState<number>(5);

  const roundMaxValue = isRoundTwo ? 2000 : 1000;
  const boardOwner = room.players.find((p) => p.id === room.boardOwnerPlayerId) ?? null;
  const boardOwnerScore = boardOwner ? Math.max(boardOwner.score, 0) : 0;
  const wagerMax = Math.max(boardOwnerScore, roundMaxValue);
  const parsedWager = parseInt(wagerInput, 10);
  const isWagerValid = !isNaN(parsedWager) && parsedWager >= 5 && parsedWager <= wagerMax;

  const selectedCategory = useMemo(
    () => catalog.find((category) => category.id === selectedCategoryId) ?? catalog[0],
    [catalog, selectedCategoryId]
  );

  const selectedOrActiveClue = useMemo(() => {
    if (room.selectedClueId) {
      for (const category of catalog) {
        const match = category.clues.find((clue) => clue.id === room.selectedClueId);
        if (match) {
          return { categoryName: category.name, clue: match };
        }
      }
    }
    return null;
  }, [catalog, room.selectedClueId]);

  const previewClue = draftClue ?? selectedOrActiveClue;
  const hasActiveClue = Boolean(room.selectedClueId);
  const hasBuzzedPlayer = Boolean(room.firstBuzzedPlayerId);

  useEffect(() => {
    if (hasActiveClue && draftClue) {
      setDraftClue(null);
    }
  }, [hasActiveClue, draftClue]);

  const handleStartFinalJeopardy = () => {
    const customFJ = room.customBoard?.finalJeopardy;
    if (customFJ) {
      onStartFinalJeopardy(customFJ.category, customFJ.question, customFJ.answer);
    } else {
      const fj = pickFinalJeopardyClue(seed);
      onStartFinalJeopardy(fj.category, fj.question, fj.answer);
    }
  };

  const sendDraftClueToBoard = () => {
    if (!draftClue) return;
    onSelectClue(draftClue.clue.id, draftClue.clue.question, roundLabel, draftClue.clue.value, draftClue.clue.isDailyDouble, buzzerTimerSeconds * 1000);
    setDraftClue(null);
    setWagerInput("");
  };

  const submitDailyDoubleWager = () => {
    if (!isWagerValid) return;
    onSetDailyDoubleWager(parsedWager);
    setWagerInput("");
  };

  return (
    <main className="console-layout">
      <header className="console-header">
        <button className="ghost-action" onClick={onBack}>Back</button>
        <div className="host-header-inline">
          <p className="eyebrow">Host Console</p>
          <div className="room-badge">Room {room.roomCode}</div>
        </div>
        <div className="owner-badge">Owner {room.boardOwnerPlayerName ?? "Unassigned"}</div>
        <div className="status-pill">{room.buzzersOpen ? "Buzzers Open" : "Buzzers Locked"}</div>
        {room.customBoard && (
          <div className="status-pill custom-board-active-pill">
            {room.customBoard.name || "Custom Board"}
          </div>
        )}
      </header>

      {/* ── Final Jeopardy panels ── */}
      {isInFinalJeopardy && (
        <section className="panel roster-panel">
          {room.gamePhase === "final-category" && (
            <>
              <p className="panel-label">Final Jeopardy</p>
              <h2 className="host-fj-category">{room.finalCategory}</h2>
              <p className="host-fj-phase-note">Players are wagering...</p>
              <div className="host-fj-player-chips">
                {room.players.map((p) => (
                  <div key={p.id} className={`host-fj-chip ${p.finalWager != null ? "is-ready" : ""}`}>
                    <span>{p.name}</span>
                    <span>{p.finalWager != null ? "✓" : "…"}</span>
                  </div>
                ))}
              </div>
              <div className="host-actions-grid" style={{ marginTop: "18px" }}>
                <button className="primary-action" onClick={onRevealFinalQuestion}>
                  Reveal Question
                </button>
              </div>
            </>
          )}

          {room.gamePhase === "final-question" && (
            <>
              <p className="panel-label">Final Jeopardy · {room.finalCategory}</p>
              <p className="host-fj-question">{room.finalQuestion}</p>
              <p className="host-fj-phase-note">Players are writing answers...</p>
              <div className="host-fj-player-chips">
                {room.players.map((p) => (
                  <div key={p.id} className={`host-fj-chip ${p.finalAnswer != null ? "is-ready" : ""}`}>
                    <span>{p.name}</span>
                    <span>{p.finalAnswer != null ? "✓" : "…"}</span>
                  </div>
                ))}
              </div>
              <div className="host-actions-grid" style={{ marginTop: "18px" }}>
                <button className="primary-action" onClick={onRevealFinalAnswers}>
                  Reveal Answers
                </button>
              </div>
            </>
          )}

          {room.gamePhase === "final-reveal" && (
            <>
              <p className="panel-label">Final Jeopardy · Judge Answers</p>
              {room.finalAnswer && (
                <div className="host-fj-correct-answer-row">
                  {room.finalAnswerShown
                    ? <p className="host-fj-correct-answer">✓ {room.finalAnswer}</p>
                    : <button className="primary-action" style={{ marginBottom: "8px" }} onClick={onShowFinalAnswer}>
                        Reveal Correct Answer on Screen
                      </button>
                  }
                </div>
              )}
              <div className="host-fj-judge-list">
                {room.players.map((p) => (
                  <div key={p.id} className={`host-fj-judge-card ${p.finalRevealed ? (p.finalAnswerCorrect ? "is-correct" : "is-incorrect") : ""}`}>
                    <div className="host-fj-judge-header">
                      <span className="host-fj-judge-name">{p.name}</span>
                      <span className="host-fj-judge-wager">
                        {p.finalRevealed
                          ? (p.finalAnswerCorrect ? "+" : "−") + `$${Math.abs(p.finalWager ?? 0).toLocaleString()}`
                          : `Wager: $${(p.finalWager ?? 0).toLocaleString()}`}
                      </span>
                    </div>
                    {/* Step 1: not yet revealed to board — show Reveal button */}
                    {!p.finalAnswerRevealed && (
                      <div className="host-actions-grid" style={{ marginTop: "8px" }}>
                        <button className="primary-action" onClick={() => onRevealFinalAnswer(p.id)}>
                          Reveal Answer
                        </button>
                      </div>
                    )}
                    {/* Step 2: revealed on board — show answer + judge buttons */}
                    {p.finalAnswerRevealed && !p.finalRevealed && (
                      <>
                        <p className="host-fj-judge-answer">{p.finalAnswer ?? "(no answer)"}</p>
                        <div className="host-actions-grid" style={{ marginTop: "8px" }}>
                          <button className="secondary-action" onClick={() => onJudgeFinalAnswer(p.id, false)}>Wrong</button>
                          <button className="secondary-action" onClick={() => onJudgeFinalAnswer(p.id, true)}>Correct</button>
                        </div>
                      </>
                    )}
                    {/* Step 3: judged — show result */}
                    {p.finalRevealed && (
                      <p className="host-fj-judge-answer">
                        {p.finalAnswer ?? "(no answer)"} — {p.finalAnswerCorrect ? "✓ Correct" : "✗ Wrong"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {room.players.every((p) => p.finalRevealed) && (
                <div className="host-actions-grid" style={{ marginTop: "14px" }}>
                  <button className="primary-action" onClick={onEndGame}>End Game</button>
                </div>
              )}
            </>
          )}

          {room.gamePhase === "game-over" && (
            <>
              <p className="panel-label">Game Over</p>
              <h2>Final Scores</h2>
              <div className="host-fj-final-scores">
                {[...room.players].sort((a, b) => b.score - a.score).map((p, i) => (
                  <div key={p.id} className={`host-fj-final-row rank-${i + 1}`}>
                    <span className="host-fj-final-rank">{i + 1}</span>
                    <span className="host-fj-final-name">{p.name}</span>
                    <span className="host-fj-final-score">
                      {p.score < 0 ? `-$${Math.abs(p.score).toLocaleString()}` : `$${p.score.toLocaleString()}`}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* ── Regular gameplay panel ── */}
      {!isInFinalJeopardy && (
      <section className="panel roster-panel">
        {!hasActiveClue && !draftClue && (
          <>
            <div className="roster-header">
              <div>
                <p className="panel-label">Clue Selection</p>
                <h2>Category Then Dollar Amount</h2>
              </div>
            </div>

            {/* Category reveal controls */}
            {catalog.some((cat) => !(room.revealedCategoryIds ?? []).includes(cat.id)) && (
              <div className="host-reveal-strip">
                <p className="panel-label" style={{ marginBottom: 6 }}>Reveal Categories (web board is hidden until revealed)</p>
                <div className="host-reveal-buttons">
                  {catalog.map((cat) => {
                    const isRevealed = (room.revealedCategoryIds ?? []).includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        className={`host-reveal-btn ${isRevealed ? "is-revealed" : ""}`}
                        disabled={isRevealed}
                        onClick={() => onRevealCategory(cat.id)}
                      >
                        {isRevealed ? `✓ ${cat.name}` : `Reveal: ${cat.name}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="host-category-strip" role="tablist" aria-label="Select category">
              {catalog.map((category) => (
                <button
                  key={category.id}
                  className={`host-category-chip ${selectedCategory?.id === category.id ? "is-selected" : ""}`}
                  onClick={() => setSelectedCategoryId(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>

            <div className="host-value-grid">
              {selectedCategory?.clues.map((clue) => {
                const isAnswered = room.answeredClueIds.includes(clue.id);

                return (
                  <button
                    key={clue.id}
                    className={`host-clue-button ${clue.isDailyDouble ? "is-daily-double" : ""}`}
                    disabled={isAnswered}
                    onClick={() => {
                      if (clue.isDailyDouble) {
                        onSelectClue(clue.id, clue.question, roundLabel, clue.value, true, buzzerTimerSeconds * 1000);
                      } else {
                        setDraftClue({ categoryName: selectedCategory.name, clue });
                        setWagerInput("");
                      }
                    }}
                  >
                    {isAnswered ? "DONE" : `$${clue.value}`}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {previewClue && (
          <div className="host-clue-preview">
            <p className="panel-label">Active Clue</p>
            {previewClue.clue.isDailyDouble && (
              <div className="host-dd-badge">⭐ Daily Double</div>
            )}
            <h3>{previewClue.categoryName} for ${previewClue.clue.value}</h3>

            {/* Active daily double, wager not yet set: show wager input */}
            {hasActiveClue && room.isDailyDoubleActive && !room.dailyDoubleWager && (
              <div className="host-dd-wager-section">
                <p className="host-dd-wager-owner">
                  {room.boardOwnerPlayerName ?? "Player"} is wagering
                </p>
                <p className="host-dd-wager-range">
                  Min: $5 — Max: ${wagerMax.toLocaleString()}
                </p>
                <input
                  className="host-dd-wager-input"
                  type="number"
                  min={5}
                  max={wagerMax}
                  value={wagerInput}
                  onChange={(e) => setWagerInput(e.target.value)}
                  placeholder="Enter wager amount"
                />
              </div>
            )}

            {/* Active daily double: show confirmed wager */}
            {hasActiveClue && room.isDailyDoubleActive && (room.dailyDoubleWager ?? 0) > 0 && (
              <p className="host-dd-active-wager">
                Wager: ${(room.dailyDoubleWager ?? 0).toLocaleString()}
              </p>
            )}

            {!room.isDailyDoubleActive && (
              <p className="host-first-buzz">
                {room.firstBuzzedPlayerId
                  ? `${room.players.find((player) => player.id === room.firstBuzzedPlayerId)?.name ?? "Player"} buzzed first`
                  : hasActiveClue && room.buzzersOpen
                  ? "Buzzers open — waiting for buzz..."
                  : hasActiveClue
                  ? "Read the clue, then open buzzers"
                  : ""}
              </p>
            )}

            <p className="host-preview-question">{previewClue.clue.question}</p>
            <p className="host-preview-answer">Answer: {previewClue.clue.answer}</p>
            <div className="host-actions-grid">
              {!hasActiveClue && (
                <button className="primary-action" onClick={sendDraftClueToBoard}>
                  Reveal Question
                </button>
              )}
              {hasActiveClue && room.isDailyDoubleActive && !room.dailyDoubleWager && !room.answerRevealed && (
                <button
                  className="primary-action host-dd-send-button"
                  disabled={!isWagerValid}
                  onClick={submitDailyDoubleWager}
                >
                  Set Wager &amp; Reveal
                </button>
              )}
              {hasActiveClue && room.isDailyDoubleActive && room.dailyDoubleWager && !room.answerRevealed && (
                <>
                  <button className="secondary-action" onClick={onMarkIncorrect}>Incorrect</button>
                  <button className="secondary-action" onClick={onRevealAnswer}>Correct</button>
                </>
              )}
              {hasActiveClue && !room.isDailyDoubleActive && !room.buzzersOpen && !hasBuzzedPlayer && !room.answerRevealed && (
                <button className="primary-action" onClick={onOpenBuzzers}>Open Buzzers</button>
              )}
              {hasActiveClue && !room.isDailyDoubleActive && hasBuzzedPlayer && !room.answerRevealed && (
                <button className="secondary-action" onClick={onMarkIncorrect}>Incorrect</button>
              )}
              {hasActiveClue && !room.isDailyDoubleActive && hasBuzzedPlayer && !room.answerRevealed && (
                <button className="secondary-action" onClick={onRevealAnswer}>Correct</button>
              )}
              {hasActiveClue && !room.isDailyDoubleActive && room.buzzersOpen && !hasBuzzedPlayer && !room.answerRevealed && (
                <button className="secondary-action" onClick={onRevealAnswer}>Reveal Answer</button>
              )}
              {hasActiveClue && !room.isDailyDoubleActive && !room.buzzersOpen && !hasBuzzedPlayer && !room.answerRevealed && (
                <button className="secondary-action" onClick={onRevealAnswer}>Skip to Answer</button>
              )}
              {hasActiveClue && room.answerRevealed && (
                <button className="secondary-action" onClick={onCloseClue}>Next Clue</button>
              )}
            </div>
          </div>
        )}
      </section>
      )}

      <section className="panel roster-panel">
        <div className="roster-header">
          <div>
            <p className="panel-label">Scores</p>
          </div>
        </div>

        <div className="host-scoreboard">
          {room.players.map((player) => {
            const adjustValue = hasActiveClue && room.selectedClueValue > 0
              ? room.selectedClueValue
              : 100;
            const adjustLabel = hasActiveClue && room.selectedClueValue > 0
              ? `$${adjustValue}`
              : "100";
            return (
              <div
                className={`host-score-card ${room.boardOwnerPlayerId === player.id ? "is-owner" : ""}`}
                key={player.id}
              >
                <div className="host-score-name">{player.name}</div>
                <div className="host-score-points">
                  {player.score < 0 ? `-$${Math.abs(player.score)}` : `$${player.score}`}
                </div>
                <div className="host-score-adjust">
                  <button className="score-adjust-button" onClick={() => onUpdateScore(player.id, -adjustValue)}>−{adjustLabel}</button>
                  <button className="score-adjust-button" onClick={() => onUpdateScore(player.id, adjustValue)}>+{adjustLabel}</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {!isInFinalJeopardy && (
        <div className="host-settings-bar">
          <div className="host-settings-row">
            <label className="host-settings-label" htmlFor="buzzer-timer">
              Buzz-in timer
            </label>
            <div className="host-settings-control">
              <input
                id="buzzer-timer"
                className="host-settings-input"
                type="number"
                min={1}
                max={30}
                value={buzzerTimerSeconds}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 1 && v <= 30) setBuzzerTimerSeconds(v);
                }}
              />
              <span className="host-settings-unit">sec</span>
            </div>
          </div>
          <button className="host-fj-start-button host-fj-skip-bottom" onClick={handleStartFinalJeopardy}>
            Skip to Final Jeopardy →
          </button>
        </div>
      )}
    </main>
  );
};

export default HostConsole;