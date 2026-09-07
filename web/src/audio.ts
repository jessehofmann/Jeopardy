function makeAudio(src: string, loop = false): HTMLAudioElement {
  const el = new Audio(src);
  el.loop = loop;
  return el;
}

const theme = makeAudio("/assets/sounds/ThemeSong.m4a", true);
const boardFill = makeAudio("/assets/sounds/BoardFill.mp3");
let boardFillDurationMs = 4000;
boardFill.addEventListener("loadedmetadata", () => {
  if (boardFill.duration && !isNaN(boardFill.duration)) {
    boardFillDurationMs = boardFill.duration * 1000;
  }
});
const dailyDouble = makeAudio("/assets/sounds/DailyDouble.mp3");
const correct = makeAudio("/assets/sounds/Correct.mp3");
const timesUp = makeAudio("/assets/sounds/Times%20up.mp3");
const wrongAnswer = makeAudio("/assets/sounds/Wrong%20Answer.mp3");
const finalJeopardy = makeAudio("/assets/sounds/FinalJeopardyMusic.mp3");

const allElements = [theme, boardFill, dailyDouble, correct, timesUp, wrongAnswer, finalJeopardy];

const VOLUME_KEY = "jeopardy.audio.volume";
let _muted = false;
let _volume = 1;
try {
  const saved = parseFloat(localStorage.getItem(VOLUME_KEY) || "");
  if (Number.isFinite(saved) && saved >= 0 && saved <= 1) _volume = saved;
} catch { /* ignore */ }

function applyVolume() {
  for (const el of allElements) el.volume = _volume;
}
applyVolume();

function play(el: HTMLAudioElement) {
  if (_muted || _volume === 0) return;
  el.currentTime = 0;
  el.volume = _volume;
  el.play().catch(() => {});
}

function stop(el: HTMLAudioElement) {
  el.pause();
  el.currentTime = 0;
}

export const audio = {
  playTheme: () => play(theme),
  ensureThemePlaying: () => { if (!_muted && theme.paused) play(theme); },
  stopTheme: () => stop(theme),
  playBoardFill: () => play(boardFill),
  getBoardFillDuration: () => boardFillDurationMs,
  playDailyDouble: () => play(dailyDouble),
  playCorrect: () => play(correct),
  playTimesUp: () => play(timesUp),
  playWrongAnswer: () => play(wrongAnswer),
  playFinalJeopardy: () => play(finalJeopardy),
  stopFinalJeopardy: () => stop(finalJeopardy),
  getMuted: () => _muted,
  setMuted: (muted: boolean) => {
    _muted = muted;
    if (muted) {
      allElements.forEach(el => el.pause());
    }
  },
  getVolume: () => _volume,
  setVolume: (volume: number) => {
    _volume = Math.max(0, Math.min(1, volume));
    applyVolume();
    try { localStorage.setItem(VOLUME_KEY, String(_volume)); } catch { /* ignore */ }
    if (_volume === 0) {
      allElements.forEach(el => el.pause());
    }
  },
};
