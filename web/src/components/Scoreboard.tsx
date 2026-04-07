import React, { useEffect, useRef, useState } from "react";
import { RoomPlayer } from "../types";
import { audio } from "../audio";

interface ScoreboardProps {
  players: RoomPlayer[];
  firstBuzzedPlayerId?: string | null;
  answerDeadlineMs?: number | null;
  buzzersOpen?: boolean;
  lockedOutPlayerIds?: string[];
  answerRevealed?: boolean;
}

const ANSWER_TIMER_MS = 5000;
const BW = 2; // border stroke width
const BR = 4; // border-radius (matches CSS)

// Draws a gold border that drains clockwise along the card edge as progress goes 0→1.
const SnakeBorder: React.FC<{ progress: number }> = ({ progress }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setDims({
        w: Math.round(entry.contentRect.width),
        h: Math.round(entry.contentRect.height),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The SVG sits flush over the card border (BW px larger on each side).
  const svgW = dims.w + BW * 2;
  const svgH = dims.h + BW * 2;
  const half = BW / 2; // inset so stroke center aligns with border edge
  const perimeter = 2 * (svgW + svgH);
  const dashOffset = progress * perimeter;

  return (
    // ref div is transparent, zero-size, just used for ResizeObserver
    <div ref={ref} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {dims.w > 0 && (
        <svg
          width={svgW}
          height={svgH}
          style={{
            position: "absolute",
            top: -BW,
            left: -BW,
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          <defs>
            <filter id="snake-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect
            x={half}
            y={half}
            width={svgW - BW}
            height={svgH - BW}
            rx={BR}
            ry={BR}
            fill="none"
            stroke="#FFD700"
            strokeWidth={BW}
            strokeDasharray={perimeter}
            strokeDashoffset={dashOffset}
            filter="url(#snake-glow)"
          />
        </svg>
      )}
    </div>
  );
};

const Scoreboard: React.FC<ScoreboardProps> = ({ players, firstBuzzedPlayerId, answerDeadlineMs, buzzersOpen, lockedOutPlayerIds, answerRevealed }) => {
  const [timedOut, setTimedOut] = useState(false);
  const [answerProgress, setAnswerProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const soundedRef = useRef(false);
  const prevDeadlineRef = useRef<number | null>(null);
  const prevBuzzersOpenRef = useRef(false);

  // Play Times Up when buzzers close with no buzz
  useEffect(() => {
    const wasOpen = prevBuzzersOpenRef.current;
    prevBuzzersOpenRef.current = buzzersOpen ?? false;
    if (wasOpen && !(buzzersOpen ?? false) && !firstBuzzedPlayerId) {
      audio.playTimesUp();
    }
  }, [buzzersOpen, firstBuzzedPlayerId]);

  useEffect(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }

    if (!answerDeadlineMs && prevDeadlineRef.current != null && !soundedRef.current) {
      soundedRef.current = true;
      if (Date.now() >= prevDeadlineRef.current) {
        // Timer expired naturally (server beat local timer) — Times Up
        audio.playTimesUp();
        setTimedOut(true);
        setAnswerProgress(1);
      } else if (!answerRevealed) {
        // Host pressed Incorrect before the timer ran out — Wrong Answer
        audio.playWrongAnswer();
        setTimedOut(false);
        setAnswerProgress(0);
      }
      prevDeadlineRef.current = null;
      return;
    }

    prevDeadlineRef.current = answerDeadlineMs ?? null;

    if (!answerDeadlineMs || !firstBuzzedPlayerId) {
      soundedRef.current = false;
      setTimedOut(false);
      setAnswerProgress(0);
      return;
    }

    soundedRef.current = false;
    setTimedOut(false);

    const remaining = answerDeadlineMs - Date.now();
    if (remaining <= 0) {
      soundedRef.current = true;
      audio.playTimesUp();
      setTimedOut(true);
      setAnswerProgress(1);
      return;
    }

    timerRef.current = setTimeout(() => {
      if (!soundedRef.current) { soundedRef.current = true; audio.playTimesUp(); }
      setTimedOut(true);
    }, remaining);

    const startTime = answerDeadlineMs - ANSWER_TIMER_MS;
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / ANSWER_TIMER_MS);
      setAnswerProgress(progress);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [answerDeadlineMs, firstBuzzedPlayerId, answerRevealed]);

  return (
    <div className="scoreboard">
      {players.map((player) => {
        const isBuzzed = player.id === firstBuzzedPlayerId;
        const isActive = isBuzzed && !timedOut;
        const isLockedOut = lockedOutPlayerIds?.includes(player.id) ?? false;
        // Show snake while counting down; freeze at 1 (fully drained) when timed out
        const snakeProgress = isBuzzed ? (timedOut ? 1 : answerProgress) : null;

        return (
          <div
            key={player.id}
            className={`player-score${isActive ? " is-answering" : ""}${isLockedOut ? " is-locked-out" : ""}`}
            style={snakeProgress !== null ? { border: `${BW}px solid transparent`, position: "relative", overflow: "visible" } : undefined}
          >
            {snakeProgress !== null && <SnakeBorder progress={snakeProgress} />}
            {player.showNameSignature && player.nameSignatureDataUrl ? (
              <img src={player.nameSignatureDataUrl} className="player-name-sig" alt={player.name} />
            ) : (
              <div className="player-name">{player.name}</div>
            )}
            <div className="player-points">
              {player.score < 0 ? `-$${Math.abs(player.score)}` : `$${player.score}`}
            </div>
            {isLockedOut && <div className="player-locked-out">✕ Locked Out</div>}
            {player.isConnected === false && (
              <div className="player-connection-state">Disconnected</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Scoreboard;
