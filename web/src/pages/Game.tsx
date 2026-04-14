import React, { useEffect, useMemo, useRef, useState } from "react";
import Board from "../components/Board";
import FinalJeopardy from "../components/FinalJeopardy";
import Scoreboard from "../components/Scoreboard";
import { createBoardCatalogsWithExcludes } from "../data/sampleData";
import { Category, CustomBoard, GamePhase, RoomPlayer, RoomState } from "../types";
import { audio } from "../audio";

const CLUE_HISTORY_KEY = "jeopardy.clueHistory.v1";
const CLUE_HISTORY_LIMIT = 240;

function normalizeClueIdList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of value) {
    const clueId = String(item || "").trim();
    if (!clueId || seen.has(clueId)) {
      continue;
    }

    seen.add(clueId);
    normalized.push(clueId);
  }

  return normalized;
}

function persistRecentClueIds(round1ClueIds: string[], round2ClueIds: string[]) {
  try {
    const raw = localStorage.getItem(CLUE_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const currentRound1 = normalizeClueIdList(parsed?.round1);
    const currentRound2 = normalizeClueIdList(parsed?.round2);

    const nextRound1 = normalizeClueIdList([...currentRound1, ...round1ClueIds]).slice(-CLUE_HISTORY_LIMIT);
    const nextRound2 = normalizeClueIdList([...currentRound2, ...round2ClueIds]).slice(-CLUE_HISTORY_LIMIT);

    localStorage.setItem(CLUE_HISTORY_KEY, JSON.stringify({ round1: nextRound1, round2: nextRound2 }));
  } catch {
    // Ignore local storage failures and continue gameplay.
  }
}

interface GameProps {
  initialRoomCode: string;
  initialRoomState: RoomState | null;
  boardSocket: WebSocket | null;
  onBackToMenu: () => void;
}

const Game: React.FC<GameProps> = ({ initialRoomCode, initialRoomState, boardSocket, onBackToMenu }) => {
  const [round, setRound] = useState<1 | 2>(1);
  const [boardSeed, setBoardSeed] = useState<string>(() => {
    const roomSeed = initialRoomState?.boardSeed || initialRoomState?.roomCode || initialRoomCode;
    return roomSeed || `local-${Math.random().toString(36).slice(2, 8)}`;
  });
  const [round1ExcludeClueIds, setRound1ExcludeClueIds] = useState<string[]>(() =>
    normalizeClueIdList(initialRoomState?.round1ExcludeClueIds)
  );
  const [round2ExcludeClueIds, setRound2ExcludeClueIds] = useState<string[]>(() =>
    normalizeClueIdList(initialRoomState?.round2ExcludeClueIds)
  );
  const [categories, setCategories] = useState<Category[]>(() =>
    createBoardCatalogsWithExcludes(boardSeed, 6, round1ExcludeClueIds, round2ExcludeClueIds).round1
  );
  const [players, setPlayers] = useState<RoomPlayer[]>([
    { id: "1", name: "Player 1", score: 0, status: "locked", isConnected: true },
    { id: "2", name: "Player 2", score: 0, status: "locked", isConnected: true },
    { id: "3", name: "Player 3", score: 0, status: "locked", isConnected: true },
  ]);
  const [showRoundBanner, setShowRoundBanner] = useState(true);
  const [boardAnimKey, setBoardAnimKey] = useState<number | null>(null);
  const [isSynced, setIsSynced] = useState(Boolean(boardSocket));
  const [selectedClueId, setSelectedClueId] = useState<string | null>(null);
  const [generatedRoomCode, setGeneratedRoomCode] = useState<string | null>(initialRoomCode || null);
  const [connectionStatus, setConnectionStatus] = useState(boardSocket ? "" : "Disconnected");
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const activeSocketRef = useRef<WebSocket | null>(boardSocket);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_RECONNECT_ATTEMPTS = 8;
  const [isHostConnected, setIsHostConnected] = useState(false);
  const [boardOwnerPlayerName, setBoardOwnerPlayerName] = useState<string | null>(null);
  const [boardOwnerPlayerId, setBoardOwnerPlayerId] = useState<string | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [firstBuzzedPlayerName, setFirstBuzzedPlayerName] = useState<string | null>(null);
  const [isDailyDoubleActive, setIsDailyDoubleActive] = useState(false);
  const [dailyDoubleWager, setDailyDoubleWager] = useState<number | null>(null);
  const [firstBuzzedPlayerId, setFirstBuzzedPlayerId] = useState<string | null>(null);
  const [answerDeadlineMs, setAnswerDeadlineMs] = useState<number | null>(null);
  const [buzzersOpen, setBuzzersOpen] = useState(false);
  const [buzzerDeadlineMs, setBuzzerDeadlineMs] = useState<number | null>(null);
  const [lockedOutPlayerIds, setLockedOutPlayerIds] = useState<string[]>([]);
  const [revealedCategoryIds, setRevealedCategoryIds] = useState<string[]>([]);
  const [showDailyDoubleSplash, setShowDailyDoubleSplash] = useState(false);
  const prevDailyDoubleActiveRef = useRef(false);
  const prevPlayerScoresRef = useRef<Record<string, number>>({});
  const [gamePhase, setGamePhase] = useState<GamePhase>("playing");
  const [finalCategory, setFinalCategory] = useState<string | null>(null);
  const [finalQuestion, setFinalQuestion] = useState<string | null>(null);
  const [finalAnswer, setFinalAnswer] = useState<string | null>(null);
  const [finalAnswerShown, setFinalAnswerShown] = useState(false);
  const [finalQuestionDeadlineMs, setFinalQuestionDeadlineMs] = useState<number | null>(null);
  const [customBoard, setCustomBoard] = useState<CustomBoard | null>(null);

  useEffect(() => {
    if (isDailyDoubleActive && !prevDailyDoubleActiveRef.current) {
      setShowDailyDoubleSplash(true);
      audio.playDailyDouble();
      const timer = setTimeout(() => setShowDailyDoubleSplash(false), 3500);
      prevDailyDoubleActiveRef.current = true;
      return () => clearTimeout(timer);
    }
    if (!isDailyDoubleActive) {
      prevDailyDoubleActiveRef.current = false;
      setShowDailyDoubleSplash(false);
    }
  }, [isDailyDoubleActive]);


  // Play correct sound when a player's score increases due to a clue answer (not manual adjustment)
  useEffect(() => {
    const prevScores = prevPlayerScoresRef.current;
    if (gamePhase === "playing" && selectedClueId) {
      for (const player of players) {
        const prev = prevScores[player.id];
        if (prev !== undefined && player.score > prev) {
          audio.playCorrect();
        }
      }
    }
    prevPlayerScoresRef.current = Object.fromEntries(players.map((p) => [p.id, p.score]));
  }, [players, gamePhase, selectedClueId]);

  const wsUrl = useMemo(() => {
    const envUrl = import.meta.env.VITE_WS_URL;
    if (envUrl) return envUrl;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.host}/ws`;
  }, []);

  const createCatalogs = (seed: string) =>
    createBoardCatalogsWithExcludes(seed, 6, round1ExcludeClueIds, round2ExcludeClueIds);

  useEffect(() => {
    setShowRoundBanner(true);
    setBoardAnimKey(null);
    const timer = setTimeout(() => {
      setShowRoundBanner(false);
      setBoardAnimKey(round);
    }, 2500);
    return () => clearTimeout(timer);
  }, [round]);

  const applyAnsweredToCategories = (base: Category[], answeredClueIds: string[]) => {
    const answeredSet = new Set(answeredClueIds);
    return base.map((category) => ({
      ...category,
      clues: category.clues.map((clue) => ({
        ...clue,
        isAnswered: answeredSet.has(clue.id),
      })),
    }));
  };

  const handleRemoteRoomState = (room: RoomState, serverTimestamp?: number) => {
    const clockOffset = serverTimestamp != null ? serverTimestamp - Date.now() : 0;
    const adjDeadline = (d: number | null | undefined): number | null =>
      d != null ? d - clockOffset : null;
    const roomSeed = (room.boardSeed || room.roomCode || "").trim();
    if (roomSeed && roomSeed !== boardSeed) {
      setBoardSeed(roomSeed);
    }

    setRound1ExcludeClueIds(normalizeClueIdList(room.round1ExcludeClueIds));
    setRound2ExcludeClueIds(normalizeClueIdList(room.round2ExcludeClueIds));

    const isRoundTwo = room.roundLabel.toLowerCase().includes("double") || room.roundLabel.toLowerCase().includes("round 2");
    const targetRound: 1 | 2 = isRoundTwo ? 2 : 1;
    if (targetRound !== round) {
      setRound(targetRound);
    }

    const newCustomBoard = room.customBoard ?? null;
    setCustomBoard(newCustomBoard);

    let base: Category[];
    if (newCustomBoard) {
      base = isRoundTwo ? (newCustomBoard.round2 ?? newCustomBoard.round1) : newCustomBoard.round1;
    } else {
      const catalogs = createBoardCatalogsWithExcludes(
        roomSeed || boardSeed,
        6,
        normalizeClueIdList(room.round1ExcludeClueIds),
        normalizeClueIdList(room.round2ExcludeClueIds)
      );
      base = isRoundTwo ? catalogs.round2 : catalogs.round1;
    }
    setCategories(applyAnsweredToCategories(base, room.answeredClueIds || []));
    setIsHostConnected(room.isHostConnected ?? false);
    setBoardOwnerPlayerName(room.boardOwnerPlayerName ?? null);
    setBoardOwnerPlayerId(room.boardOwnerPlayerId ?? null);
    setSelectedClueId(room.selectedClueId || null);
    setAnswerRevealed(room.answerRevealed ?? false);
    setFirstBuzzedPlayerName(room.firstBuzzedPlayerName ?? null);
    setIsDailyDoubleActive(room.isDailyDoubleActive ?? false);
    setDailyDoubleWager(room.dailyDoubleWager ?? null);
    setFirstBuzzedPlayerId(room.firstBuzzedPlayerId ?? null);
    setAnswerDeadlineMs(adjDeadline(room.answerDeadlineMs));
    setBuzzersOpen(room.buzzersOpen ?? false);
    setBuzzerDeadlineMs(adjDeadline(room.buzzerDeadlineMs));
    setLockedOutPlayerIds(room.lockedOutPlayerIds ?? []);
    setRevealedCategoryIds(room.revealedCategoryIds ?? []);
    setGamePhase(room.gamePhase ?? "playing");
    setFinalCategory(room.finalCategory ?? null);
    setFinalQuestion(room.finalQuestion ?? null);
    setFinalAnswer(room.finalAnswer ?? null);
    setFinalAnswerShown(room.finalAnswerShown ?? false);
    setFinalQuestionDeadlineMs(adjDeadline(room.finalQuestionDeadlineMs));
    setPlayers(
      (room.players || []).map((player) => ({
        ...player,
        isConnected: player.isConnected !== false,
      }))
    );
  };

  useEffect(() => {
    if (!initialRoomState) {
      return;
    }

    const roomSeed = initialRoomState.boardSeed || initialRoomState.roomCode || initialRoomCode;
    if (roomSeed) {
      setBoardSeed(roomSeed);
    }

    setRound1ExcludeClueIds(normalizeClueIdList(initialRoomState.round1ExcludeClueIds));
    setRound2ExcludeClueIds(normalizeClueIdList(initialRoomState.round2ExcludeClueIds));

    setGeneratedRoomCode(initialRoomState.roomCode || initialRoomCode || null);
    setIsSynced(Boolean(boardSocket));
    setConnectionStatus("");
    handleRemoteRoomState(initialRoomState);
  }, [initialRoomState, initialRoomCode, boardSocket]);

  useEffect(() => {
    const catalogs = createCatalogs(boardSeed);
    persistRecentClueIds(
      catalogs.round1.flatMap((category) => category.clues.map((clue) => clue.id)),
      catalogs.round2.flatMap((category) => category.clues.map((clue) => clue.id))
    );
  }, [boardSeed, round1ExcludeClueIds, round2ExcludeClueIds]);

  const attachSocketListeners = (socket: WebSocket, roomCode: string, attempt: number) => {
    const handleMessage = (event: MessageEvent) => {
      let message: { type?: string; payload?: any; serverTimestamp?: number } = {};
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }

      if (message.type === "room:state" && message.payload?.room) {
        handleRemoteRoomState(message.payload.room, message.serverTimestamp);
        return;
      }

      if (message.type === "board:roomCreated" && message.payload?.room) {
        setIsSynced(true);
        setGeneratedRoomCode(roomCode);
        setConnectionStatus("");
        setReconnectAttempt(0);
        handleRemoteRoomState(message.payload.room, undefined);
        return;
      }

      if (message.type === "error") {
        const errText = message.payload?.message || "Server error";
        setConnectionStatus(errText);
        if (errText.includes("Room closed")) {
          onBackToMenu();
        }
      }
    };

    const handleClose = () => {
      setIsSynced(false);
      setConnectionStatus("Disconnected");
      if (attempt < MAX_RECONNECT_ATTEMPTS) {
        scheduleReconnect(roomCode, attempt + 1);
      }
    };

    socket.addEventListener("message", handleMessage);
    socket.addEventListener("close", handleClose);
  };

  const scheduleReconnect = (roomCode: string, attempt: number) => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    const delayMs = Math.min(500 * Math.pow(2, attempt - 1), 16000);
    setReconnectAttempt(attempt);
    setConnectionStatus(`Reconnecting… (${attempt}/${MAX_RECONNECT_ATTEMPTS})`);

    reconnectTimerRef.current = setTimeout(() => {
      const socket = new WebSocket(wsUrl);
      activeSocketRef.current = socket;

      socket.addEventListener("open", () => {
        socket.send(JSON.stringify({ type: "board:rejoinRoom", payload: { roomCode } }));
      });

      attachSocketListeners(socket, roomCode, attempt);
    }, delayMs);
  };

  useEffect(() => {
    if (!boardSocket) {
      setIsSynced(false);
      setConnectionStatus("Disconnected");
      return;
    }

    activeSocketRef.current = boardSocket;
    const roomCode = initialRoomCode;
    attachSocketListeners(boardSocket, roomCode, 0);

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [boardSocket]);

  const handleClueAnswered = (clueId: string) => {
    if (isSynced) {
      setCategories((prev) =>
        prev.map((category) => ({
          ...category,
          clues: category.clues.map((clue) =>
            clue.id === clueId ? { ...clue, isAnswered: true } : clue
          ),
        }))
      );
      setSelectedClueId(null);
      return;
    }

    setCategories((prev) => {
      const updated = prev.map((category) => ({
        ...category,
        clues: category.clues.map((clue) =>
          clue.id === clueId ? { ...clue, isAnswered: true } : clue
        ),
      }));

      const allAnswered = updated.every((cat) =>
        cat.clues.every((clue) => clue.isAnswered)
      );

      if (allAnswered && round === 1 && !customBoard) {
        setTimeout(() => {
          setRound(2);
          setCategories(createCatalogs(boardSeed).round2);
        }, 1000);
      }

      return updated;
    });
  };

  const displayStatus = connectionStatus === "Waiting for host..." ? "" : connectionStatus;

  return (
    <div className="game-container">
      {showRoundBanner && (
        <div className="round-banner">
          <h2>{round === 1 ? "ROUND 1" : "ROUND 2 - DOUBLE JEOPARDY!"}</h2>
        </div>
      )}
      <div className="round-indicator">
        <span>
          {gamePhase !== "playing"
            ? "FINAL JEOPARDY"
            : round === 1
            ? "ROUND 1"
            : "DOUBLE JEOPARDY"}
        </span>
        <div className="board-room-controls">
          {generatedRoomCode && (
            <div className="board-room-code-pill">
              <span className="board-room-code-label">ROOM</span>
              <span className="board-room-code-value">{generatedRoomCode}</span>
              {!isHostConnected && <span className="board-host-status">Needs host</span>}
            </div>
          )}
        </div>
        {displayStatus && <div className="board-connection-pill">{displayStatus}</div>}
      </div>
      <div className="game-top-bar">
        <div className="board-owner-pill">Owner: {boardOwnerPlayerName ?? "Unassigned"}</div>
        <button className="back-button" onClick={onBackToMenu}>MENU</button>
      </div>
      {gamePhase === "playing" ? (
        <>
          {showDailyDoubleSplash && (
            <div className="dd-splash" onClick={() => setShowDailyDoubleSplash(false)}>
              <div className="dd-splash-content">
                <div className="dd-splash-label">Daily Double!</div>
                {dailyDoubleWager != null && dailyDoubleWager > 0 && (
                  <div className="dd-splash-wager">${dailyDoubleWager.toLocaleString()}</div>
                )}
              </div>
            </div>
          )}
          <div className="board-area">
            <Board
              categories={categories}
              onClueAnswered={handleClueAnswered}
              selectedClueId={showDailyDoubleSplash || (isDailyDoubleActive && !dailyDoubleWager) ? null : selectedClueId}
              allowManualPick={!isSynced}
              answerRevealed={answerRevealed}
              firstBuzzedPlayerName={firstBuzzedPlayerName}
              isDailyDoubleActive={isDailyDoubleActive}
              dailyDoubleWager={dailyDoubleWager}
              boardKey={boardAnimKey}
              revealedCategoryIds={isSynced ? revealedCategoryIds : undefined}
              buzzerDeadlineMs={buzzerDeadlineMs}
            />
          </div>
          <Scoreboard players={players} firstBuzzedPlayerId={firstBuzzedPlayerId} answerDeadlineMs={answerDeadlineMs} buzzersOpen={buzzersOpen} lockedOutPlayerIds={lockedOutPlayerIds} answerRevealed={answerRevealed} boardOwnerPlayerId={boardOwnerPlayerId} />
        </>
      ) : (
        <FinalJeopardy
          gamePhase={gamePhase}
          finalCategory={finalCategory}
          finalQuestion={finalQuestion}
          finalAnswer={finalAnswer}
          finalAnswerShown={finalAnswerShown}
          finalQuestionDeadlineMs={finalQuestionDeadlineMs}
          players={players}
        />
      )}
    </div>
  );
};

export default Game;
