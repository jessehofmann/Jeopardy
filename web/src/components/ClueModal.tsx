import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Clue } from "../types";

interface ClueModalProps {
  clue: Clue;
  onClose: () => void;
  answerRevealed?: boolean;
  isSynced?: boolean;
  firstBuzzedPlayerName?: string | null;
  isDailyDouble?: boolean;
  dailyDoubleWager?: number | null;
  originRect?: DOMRect | null;
  buzzerDeadlineMs?: number | null;
}

const ClueModal: React.FC<ClueModalProps> = ({
  clue,
  onClose,
  answerRevealed,
  isSynced,
  firstBuzzedPlayerName,
  isDailyDouble,
  dailyDoubleWager,
  originRect,
  buzzerDeadlineMs,
}) => {
  const [localShowAnswer, setLocalShowAnswer] = useState(false);
  const showAnswer = isSynced ? (answerRevealed ?? false) : localShowAnswer;
  const [buzzerTimeLeft, setBuzzerTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!buzzerDeadlineMs) {
      setBuzzerTimeLeft(null);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((buzzerDeadlineMs - Date.now()) / 1000));
      setBuzzerTimeLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [buzzerDeadlineMs]);
  const showDailyDouble = isDailyDouble ?? clue.isDailyDouble ?? false;
  const contentRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);
  const questionWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalShowAnswer(false);
  }, [clue.id]);

  // Fit question text to fill available screen space
  useEffect(() => {
    const qEl = questionRef.current;
    const container = contentRef.current;
    if (!qEl || !container) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (!cw || !ch) return;

    const availW = Math.floor(cw * 0.86);
    let availH: number;

    if (showDailyDouble && questionWrapperRef.current) {
      // The answer/buttons overlay is absolutely positioned relative to the modal, so
      // it overlaps the bottom of the wrapper. Add paddingBottom to shift flex-center up
      // and size the question within the non-overlapping area.
      const wrapper = questionWrapperRef.current;
      const bottomPad = Math.floor(ch * 0.16);
      wrapper.style.paddingBottom = bottomPad + "px";
      const wrapperH = wrapper.clientHeight; // includes padding
      const usableH = wrapperH - bottomPad;
      availH = Math.floor(usableH * 0.94);
    } else {
      // Reserve space for answer/buttons overlay at bottom
      const bottomReserve = ch * 0.14;
      availH = Math.floor(ch - bottomReserve - ch * 0.08);
    }

    qEl.style.width = availW + "px";

    // Binary search for the largest font size that fits
    let lo = 12, hi = 300;
    for (let i = 0; i < 25; i++) {
      const mid = (lo + hi) / 2;
      qEl.style.fontSize = mid + "px";
      if (qEl.offsetHeight <= availH) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    qEl.style.fontSize = lo + "px";
  }, [clue.id, showDailyDouble, dailyDoubleWager]);

  // Zoom-from-tile: JS-driven CSS transition
  // useLayoutEffect runs before paint, so we can set the initial transform synchronously,
  // force a reflow (so the browser registers it as the "from" state), then set the target
  // state — the CSS transition then smoothly animates between them.
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el || !originRect) return;

    const modalRect = el.getBoundingClientRect();
    if (!modalRect.width || !modalRect.height) return;

    const centerX = modalRect.left + modalRect.width / 2;
    const centerY = modalRect.top + modalRect.height / 2;
    const tileX = originRect.left + originRect.width / 2;
    const tileY = originRect.top + originRect.height / 2;
    const dx = tileX - centerX;
    const dy = tileY - centerY;
    const scale = Math.min(originRect.width / modalRect.width, originRect.height / modalRect.height);

    // 1. Snap to tile position with no transition
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    el.style.opacity = '0.5';

    // 2. Force reflow — browser commits the above as the "from" state
    void el.getBoundingClientRect();

    // 3. Set target state — browser now transitions from tile → full screen
    el.style.transition = 'transform 0.7s cubic-bezier(0.2, 0, 0.2, 1), opacity 0.4s ease';
    el.style.transform = 'translate(0px, 0px) scale(1)';
    el.style.opacity = '1';

    return () => {
      el.style.transform = '';
      el.style.opacity = '';
      el.style.transition = '';
    };
  }, [clue.id, originRect]);

  return (
    <div className="modal-overlay">
      <div
        ref={contentRef}
        className={`modal-content ${showDailyDouble ? "is-daily-double" : ""}`}
      >
        {isSynced && buzzerTimeLeft !== null && !firstBuzzedPlayerName && (
          <div className={`modal-buzzer-timer ${buzzerTimeLeft <= 2 ? "is-urgent" : ""}`}>
            {buzzerTimeLeft}
          </div>
        )}
        {showDailyDouble && (
          <div className="modal-dd-header">
            <div className="modal-dd-label">Daily Double!</div>
            {dailyDoubleWager != null && dailyDoubleWager > 0 && (
              <div className="modal-dd-wager">Wager: ${dailyDoubleWager.toLocaleString()}</div>
            )}
          </div>
        )}
        {showDailyDouble ? (
          <div ref={questionWrapperRef} className="modal-dd-question-area">
            <div ref={questionRef} className="modal-question">{clue.question}</div>
          </div>
        ) : (
          <div ref={questionRef} className="modal-question">{clue.question}</div>
        )}
        {isSynced && firstBuzzedPlayerName && (
          <div className="modal-buzzed-player">First buzz: {firstBuzzedPlayerName}</div>
        )}
        {showAnswer && (
          <div className="modal-answer">Answer: {clue.answer}</div>
        )}
        {!isSynced && (
          <div className="modal-buttons">
            {!showAnswer && (
              <button className="modal-button close" onClick={() => setLocalShowAnswer(true)}>
                Show Answer
              </button>
            )}
            <button className="modal-button close" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClueModal;
