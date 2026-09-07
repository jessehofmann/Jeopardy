/** Public URL of the big-screen board app, referenced in companion instructions. */
export const BOARD_URL = import.meta.env.VITE_BOARD_URL || "jeopardy-main.vercel.app";

/** Room code passed in the URL by the lobby QR code, if any (e.g. ?room=WXYZ). */
export function roomCodeFromUrl(): string {
  try {
    const raw = new URLSearchParams(window.location.search).get("room") ?? "";
    return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  } catch {
    return "";
  }
}
