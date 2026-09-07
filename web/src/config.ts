/** Public URL of the phone companion app, shown/encoded on the lobby screen. */
export const COMPANION_URL =
  import.meta.env.VITE_COMPANION_URL || "jeopardy-companion.vercel.app";

/** Room-code alphabet — mirrors the server (no O/I/0/1 to avoid confusion). */
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomRoomCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

/** Deep link a player scans from the lobby QR — prefills the room code. */
export function companionJoinUrl(roomCode: string): string {
  const base = COMPANION_URL.startsWith("http") ? COMPANION_URL : `https://${COMPANION_URL}`;
  return `${base}/?room=${encodeURIComponent(roomCode)}`;
}
