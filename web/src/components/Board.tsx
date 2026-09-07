import React, { useEffect, useRef, useState } from "react";
import { Category, Clue } from "../types";
import ClueModal from "./ClueModal";
import { audio } from "../audio";

interface BoardProps {
  categories: Category[];
  onClueAnswered: (clueId: string) => void;
  selectedClueId?: string | null;
  allowManualPick?: boolean;
  answerRevealed?: boolean;
  firstBuzzedPlayerName?: string | null;
  isDailyDoubleActive?: boolean;
  dailyDoubleWager?: number | null;
  boardKey?: string | number | null;
  revealedCategoryIds?: string[];
  onRevealCategory?: (categoryId: string) => void;
  buzzerDeadlineMs?: number | null;
}


const Board: React.FC<BoardProps> = ({
  categories,
  onClueAnswered,
  selectedClueId = null,
  allowManualPick = true,
  answerRevealed,
  firstBuzzedPlayerName = null,
  isDailyDoubleActive,
  dailyDoubleWager,
  boardKey,
  revealedCategoryIds,
  onRevealCategory,
  buzzerDeadlineMs,
}) => {
  const [selectedClue, setSelectedClue] = useState<Clue | null>(null);
  const [selectedClueCategory, setSelectedClueCategory] = useState<string | null>(null);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const prevSelectedClueIdRef = useRef<string | null>(null);
  const [filledCells, setFilledCells] = useState<Set<string>>(new Set());

  // Board fill animation: reveal cells in random order over the BoardFill sound duration
  useEffect(() => {
    setFilledCells(new Set());

    if (boardKey === null || boardKey === undefined) {
      return;
    }

    audio.playBoardFill();

    // Reduced motion: reveal the whole board at once, skip the staggered fill.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      const every = new Set<string>();
      for (const cat of categories) for (const clue of cat.clues) every.add(clue.id);
      setFilledCells(every);
      return;
    }

    const duration = Math.max(500, audio.getBoardFillDuration() - 1000);

    // Collect clue cell IDs only — category headers appear immediately
    const allIds: string[] = [];
    for (const cat of categories) {
      for (const clue of cat.clues) {
        allIds.push(clue.id);
      }
    }

    // Deterministic scramble: hash(clueId + boardKey) so every client fills the
    // board in the same order (matches the deterministic board seed).
    const hash = (str: string) => {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    };
    allIds.sort((a, b) => hash(a + boardKey) - hash(b + boardKey));

    const staggerMs = duration / allIds.length;
    const timers: ReturnType<typeof setTimeout>[] = [];
    allIds.forEach((id, index) => {
      const t = setTimeout(() => {
        setFilledCells((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      }, index * staggerMs);
      timers.push(t);
    });

    return () => timers.forEach(clearTimeout);
  }, [boardKey]);

  useEffect(() => {
    if (!selectedClueId) {
      if (!allowManualPick && prevSelectedClueIdRef.current !== null) {
        setSelectedClue(null);
        setOriginRect(null);
      }
      prevSelectedClueIdRef.current = null;
      return;
    }

    // Categories can re-render on any server broadcast — only capture rect/clue when the ID actually changes
    if (selectedClueId === prevSelectedClueIdRef.current) {
      return;
    }

    for (const category of categories) {
      const clue = category.clues.find((item) => item.id === selectedClueId);
      if (clue && !clue.isAnswered) {
        const tileEl = document.querySelector<HTMLElement>(`[data-clue-id="${selectedClueId}"]`);
        setOriginRect(tileEl ? tileEl.getBoundingClientRect() : null);
        setSelectedClue(clue);
        setSelectedClueCategory(category.name);
        prevSelectedClueIdRef.current = selectedClueId;
        return;
      }
    }
  }, [selectedClueId, categories]);

  const allCategoriesRevealed = !revealedCategoryIds || revealedCategoryIds.length >= categories.length;

  const handleClueClick = (clue: Clue, categoryName: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (!allowManualPick) return;
    if (!allCategoriesRevealed) return;
    if (!clue.isAnswered) {
      setOriginRect((e.currentTarget as HTMLDivElement).getBoundingClientRect());
      setSelectedClue(clue);
      setSelectedClueCategory(categoryName);
    }
  };

  const handleCloseModal = () => {
    if (selectedClue) {
      onClueAnswered(selectedClue.id);
    }
    setSelectedClue(null);
    setOriginRect(null);
  };

  return (
    <>
      <div className="board">
        {categories.map((category) => {
          const isRevealed = !revealedCategoryIds || revealedCategoryIds.includes(category.id);
          return (
            <div
              key={category.id}
              className="category-header is-filled"
            >
              {isRevealed ? category.name : ""}
            </div>
          );
        })}
        {[0, 1, 2, 3, 4].map((rowIndex) =>
          categories.map((category) => {
            const clue = category.clues[rowIndex];
            const isRevealed = !revealedCategoryIds || revealedCategoryIds.includes(category.id);
            const isFilled = filledCells.has(clue.id) || boardKey === undefined;
            const isPickable = allowManualPick && isRevealed && allCategoriesRevealed && !clue.isAnswered;
            return (
              <div
                key={clue.id}
                data-clue-id={clue.id}
                className={`clue-cell${clue.isAnswered ? " answered" : ""}${isFilled ? " is-filled" : ""}${!isRevealed ? " is-hidden-cat" : ""}`}
                onClick={(e) => isRevealed && handleClueClick(clue, category.name, e)}
                role={isPickable ? "button" : undefined}
                tabIndex={isPickable ? 0 : undefined}
                aria-label={isPickable ? `${category.name}, $${clue.value}` : undefined}
                aria-disabled={clue.isAnswered || undefined}
                onKeyDown={(e) => {
                  if (isPickable && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    setOriginRect((e.currentTarget as HTMLDivElement).getBoundingClientRect());
                    setSelectedClue(clue);
                    setSelectedClueCategory(category.name);
                  }
                }}
              >
                {isFilled && <span className="clue-cell-value">${clue.value}</span>}
              </div>
            );
          })
        )}
      </div>
      {selectedClue && (
        <ClueModal
          clue={selectedClue}
          onClose={handleCloseModal}
          answerRevealed={answerRevealed}
          isSynced={!allowManualPick}
          firstBuzzedPlayerName={firstBuzzedPlayerName}
          isDailyDouble={!allowManualPick ? isDailyDoubleActive : selectedClue.isDailyDouble}
          dailyDoubleWager={dailyDoubleWager}
          originRect={originRect}
          buzzerDeadlineMs={buzzerDeadlineMs}
          categoryName={selectedClueCategory}
        />
      )}
    </>
  );
};

export default Board;
