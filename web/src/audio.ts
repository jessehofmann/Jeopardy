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

function play(el: HTMLAudioElement) {
  el.currentTime = 0;
  el.play().catch(() => {});
}

function stop(el: HTMLAudioElement) {
  el.pause();
  el.currentTime = 0;
}

export const audio = {
  playTheme: () => play(theme),
  ensureThemePlaying: () => { if (theme.paused) play(theme); },
  stopTheme: () => stop(theme),
  playBoardFill: () => play(boardFill),
  getBoardFillDuration: () => boardFillDurationMs,
  playDailyDouble: () => play(dailyDouble),
  playCorrect: () => play(correct),
  playTimesUp: () => play(timesUp),
  playWrongAnswer: () => play(wrongAnswer),
  playFinalJeopardy: () => play(finalJeopardy),
  stopFinalJeopardy: () => stop(finalJeopardy),
};
