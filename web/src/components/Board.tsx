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
}) => {
  const [selectedClue, setSelectedClue] = useState<Clue | null>(null);
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
    const duration = Math.max(500, audio.getBoardFillDuration() - 1000);

    // Collect clue cell IDs only — category headers appear immediately
    const allIds: string[] = [];
    for (const cat of categories) {
      for (const clue of cat.clues) {
        allIds.push(clue.id);
      }
    }

    // Fisher-Yates shuffle
    for (let i = allIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allIds[i], allIds[j]] = [allIds[j], allIds[i]];
    }

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

    for (const category of categories) {
      const clue = category.clues.find((item) => item.id === selectedClueId);
      if (clue && !clue.isAnswered) {
        const tileEl = document.querySelector<HTMLElement>(`[data-clue-id="${selectedClueId}"]`);
        setOriginRect(tileEl ? tileEl.getBoundingClientRect() : null);
        setSelectedClue(clue);
        prevSelectedClueIdRef.current = selectedClueId;
        return;
      }
    }
  }, [selectedClueId, categories]);

  const handleClueClick = (clue: Clue, e: React.MouseEvent<HTMLDivElement>) => {
    if (!allowManualPick) return;
    if (!clue.isAnswered) {
      setOriginRect((e.currentTarget as HTMLDivElement).getBoundingClientRect());
      setSelectedClue(clue);
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
            return (
              <div
                key={clue.id}
                data-clue-id={clue.id}
                className={`clue-cell${clue.isAnswered ? " answered" : ""}${isFilled ? " is-filled" : ""}${!isRevealed ? " is-hidden-cat" : ""}`}
                onClick={(e) => isRevealed && handleClueClick(clue, e)}
              >
                {isFilled && !clue.isAnswered && `$${clue.value}`}
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
        />
      )}
    </>
  );
};

export default Board;
