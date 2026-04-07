export type PlayerStatus = "ready" | "buzzed" | "locked";

export type GamePhase = "playing" | "final-category" | "final-question" | "final-reveal" | "game-over";

export interface Player {
    id: string;
    name: string;
    score: number;
}

export interface RoomPlayer extends Player {
    status: PlayerStatus;
    isConnected: boolean;
    nameSignatureDataUrl?: string | null;
    showNameSignature?: boolean;
    finalWager?: number | null;
    finalAnswer?: string | null;
    finalAnswerDataUrl?: string | null;
    finalAnswerRevealed?: boolean;
    finalAnswerCorrect?: boolean | null;
    finalRevealed?: boolean;
}

export interface Clue {
    id: string;
    value: number;
    question: string;
    answer: string;
    isAnswered: boolean;
    isDailyDouble?: boolean;
}

export interface Category {
    id: string;
    name: string;
    clues: Clue[];
}

export interface GameState {
    categories: Category[];
    players: Player[];
    currentClue: Clue | null;
    isGameStarted: boolean;
}

export interface CustomBoard {
    name?: string;
    round1: Category[];
    round2?: Category[];
    finalJeopardy?: {
        category: string;
        question: string;
        answer: string;
    };
}

export interface RoomState {
    roomCode: string;
    boardSeed: string;
    round1ExcludeClueIds: string[];
    round2ExcludeClueIds: string[];
    roundLabel: string;
    clueLabel: string;
    isHostConnected: boolean;
    boardOwnerPlayerId: string | null;
    boardOwnerPlayerName: string | null;
    selectedClueId: string | null;
    selectedClueValue: number;
    answerRevealed: boolean;
    answeredClueIds: string[];
    revealedCategoryIds: string[];
    buzzersOpen: boolean;
    lockedOutPlayerIds: string[];
    firstBuzzedPlayerId: string | null;
    firstBuzzedPlayerName: string | null;
    isDailyDoubleActive: boolean;
    dailyDoubleWager: number | null;
    answerDeadlineMs: number | null;
    gamePhase: GamePhase;
    finalCategory: string | null;
    finalQuestion: string | null;
    finalAnswer: string | null;
    finalAnswerShown: boolean;
    finalQuestionDeadlineMs: number | null;
    customBoard?: CustomBoard | null;
    players: RoomPlayer[];
}