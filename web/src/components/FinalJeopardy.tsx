import React, { useEffect, useRef, useState } from "react";
import type { GamePhase, RoomPlayer } from "../types";
import { audio } from "../audio";

function ordinal(n: number): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}

interface FinalJeopardyProps {
  gamePhase: GamePhase;
  finalCategory: string | null;
  finalQuestion: string | null;
  finalAnswer: string | null;
  finalAnswerShown: boolean;
  finalQuestionDeadlineMs: number | null;
  players: RoomPlayer[];
}

const FinalJeopardy: React.FC<FinalJeopardyProps> = ({
  gamePhase,
  finalCategory,
  finalQuestion,
  finalAnswer,
  finalAnswerShown,
  finalQuestionDeadlineMs,
  players,
}) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const [phaseKey, setPhaseKey] = useState(0);
  const prevPhaseRef = useRef<GamePhase | null>(null);
  const questionContainerRef = useRef<HTMLDivElement>(null);
  const questionTextRef = useRef<HTMLDivElement>(null);
  const revealedPlayerIds = useRef<Set<string>>(new Set());

  // Bump key on phase change to re-trigger entry animations
  useEffect(() => {
    if (prevPhaseRef.current !== gamePhase) {
      setPhaseKey((k) => k + 1);
      prevPhaseRef.current = gamePhase;
    }
  }, [gamePhase]);

  // Play/stop Final Jeopardy think music
  useEffect(() => {
    if (gamePhase === "final-question") {
      audio.playFinalJeopardy();
    } else {
      audio.stopFinalJeopardy();
    }
    return () => audio.stopFinalJeopardy();
  }, [gamePhase]);

  // Stop think music when timer runs out
  useEffect(() => {
    if (timeLeft <= 0) {
      audio.stopFinalJeopardy();
    }
  }, [timeLeft]);

  // Play correct/wrong sounds as each player's answer is revealed
  useEffect(() => {
    if (gamePhase !== "final-reveal") {
      revealedPlayerIds.current.clear();
      return;
    }
    for (const player of players) {
      if (player.finalRevealed && !revealedPlayerIds.current.has(player.id)) {
        revealedPlayerIds.current.add(player.id);
        if (player.finalAnswerCorrect) {
          audio.playCorrect();
        } else {
          audio.playTimesUp();
        }
      }
    }
  }, [gamePhase, players]);

  // 30-second countdown driven by server deadline
  useEffect(() => {
    if (gamePhase !== "final-question" || !finalQuestionDeadlineMs) {
      setTimeLeft(30);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((finalQuestionDeadlineMs - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [gamePhase, finalQuestionDeadlineMs]);

  // Auto-fit question text to fill available space
  useEffect(() => {
    if (gamePhase !== "final-question") return;
    const container = questionContainerRef.current;
    const text = questionTextRef.current;
    if (!container || !text) return;

    const availW = Math.floor(container.clientWidth * 0.97);
    const availH = Math.floor(container.clientHeight);
    if (!availW || !availH) return;

    text.style.width = availW + "px";
    let lo = 12, hi = 300;
    for (let i = 0; i < 25; i++) {
      const mid = (lo + hi) / 2;
      text.style.fontSize = mid + "px";
      if (text.offsetHeight <= availH) lo = mid;
      else hi = mid;
    }
    text.style.fontSize = lo + "px";
  }, [gamePhase, finalQuestion, phaseKey]);

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  // ── Game Over ──────────────────────────────────────────────────────────────
  if (gamePhase === "game-over") {
    return (
      <div className="fj-container fj-game-over" key={phaseKey}>
        <div className="fj-gameover-title">Game Over</div>
        <div className="fj-leaderboard">
          {sortedPlayers.map((player, index) => (
            <div key={player.id} className={`fj-lb-row rank-${Math.min(index + 1, 4)}`}>
              <span className="fj-lb-rank">
                {ordinal(index + 1)}
              </span>
              <span className="fj-lb-name">{player.name}</span>
              <span className="fj-lb-score">
                {player.score < 0
                  ? `-$${Math.abs(player.score).toLocaleString()}`
                  : `$${player.score.toLocaleString()}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Final Category reveal ──────────────────────────────────────────────────
  if (gamePhase === "final-category") {
    return (
      <div className="fj-container fj-phase-category" key={phaseKey}>
        <div className="fj-title-lockup">
          <div className="fj-eyebrow">Final</div>
          <div className="fj-big-title">Jeopardy!</div>
        </div>
        <div className="fj-category-reveal">
          <div className="fj-category-label">Category</div>
          <div className="fj-category-name">{finalCategory}</div>
        </div>
        <div className="fj-wager-status">
          <p className="fj-wager-label">Players are wagering...</p>
          <div className="fj-player-chips">
            {players.map((player) => (
              <div
                key={player.id}
                className={`fj-player-chip ${player.finalWager != null ? "is-ready" : "is-waiting"}`}
              >
                <span className="fj-chip-name">{player.name}</span>
                <span className="fj-chip-status">
                  {player.finalWager != null ? "✓" : "…"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Question revealed ──────────────────────────────────────────────────────
  if (gamePhase === "final-question") {
    return (
      <div className="fj-container fj-phase-question" key={phaseKey}>
        <div className="fj-question-header">
          <span className="fj-question-title">Final Jeopardy</span>
          <span className="fj-question-dot">·</span>
          <span className="fj-question-category">{finalCategory}</span>
        </div>
        <div ref={questionContainerRef} className="fj-question-body">
          <div ref={questionTextRef} className="fj-question-text">{finalQuestion}</div>
        </div>
        <div className="fj-question-footer">
          <div className={`fj-countdown ${timeLeft <= 5 ? "is-urgent" : ""}`}>
            {timeLeft}
          </div>
          <div className="fj-answer-status">
            {players.map((player) => (
              <div
                key={player.id}
                className={`fj-player-chip ${player.finalAnswer != null ? "is-ready" : "is-waiting"}`}
              >
                <span className="fj-chip-name">{player.name}</span>
                <span className="fj-chip-status">
                  {player.finalAnswer != null ? "✓" : "…"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Reveal answers ─────────────────────────────────────────────────────────
  if (gamePhase === "final-reveal") {
    return (
      <div className="fj-container fj-phase-reveal" key={phaseKey}>
        <div className="fj-question-header">
          <span className="fj-question-title">Final Jeopardy</span>
          <span className="fj-question-dot">·</span>
          <span className="fj-question-category">{finalCategory}</span>
        </div>
        {finalQuestion && (
          <div className="fj-reveal-question">{finalQuestion}</div>
        )}
        {finalAnswerShown && finalAnswer && (
          <div className="fj-correct-answer">
            <span className="fj-correct-label">Answer:</span>
            <span className="fj-correct-text">{finalAnswer}</span>
          </div>
        )}
        <div className="fj-reveal-cards">
          {players.map((player) => (
            <div
              key={player.id}
              className={`fj-reveal-card ${
                !player.finalAnswerRevealed
                  ? "is-hidden"
                  : player.finalRevealed
                  ? player.finalAnswerCorrect ? "is-correct" : "is-incorrect"
                  : "is-answering"
              }`}
            >
              {player.nameSignatureDataUrl ? (
                <img
                  src={player.nameSignatureDataUrl}
                  className="fj-card-name-sig"
                  alt={player.name}
                />
              ) : (
                <div className="fj-card-name">{player.name}</div>
              )}
              {!player.finalAnswerRevealed ? (
                <div className="fj-card-hidden">?</div>
              ) : (
                <>
                  {player.finalAnswerDataUrl ? (
                    <img
                      src={player.finalAnswerDataUrl}
                      className="fj-card-answer-img"
                      alt="answer"
                    />
                  ) : (
                    <div className="fj-card-answer">
                      {player.finalAnswer ?? "(no answer)"}
                    </div>
                  )}
                  {player.finalRevealed && (
                    <>
                      <div className={`fj-card-delta ${player.finalAnswerCorrect ? "is-positive" : "is-negative"}`}>
                        {player.finalAnswerCorrect ? "+" : "−"}${Math.abs(player.finalWager ?? 0).toLocaleString()}
                      </div>
                      <div className="fj-card-total">
                        {player.score < 0
                          ? `-$${Math.abs(player.score).toLocaleString()}`
                          : `$${player.score.toLocaleString()}`}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

export default FinalJeopardy;
