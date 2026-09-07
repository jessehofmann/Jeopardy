// Shared helpers for the catalog validator. Pure data, no dependencies.

export const ROUND_VALUES = {
  1: [200, 400, 600, 800, 1000],
  2: [400, 800, 1200, 1600, 2000],
};

/** Minimum clue options per value slot before the validator warns (tracks pool depth). */
export const MIN_OPTIONS_PER_SLOT = 3;

const STOPWORDS = new Set([
  "the", "a", "an", "of", "and", "or", "to", "in", "on", "at", "by", "for", "with",
  "this", "that", "these", "those", "is", "are", "was", "were", "his", "her", "its",
  "their", "he", "she", "it", "they", "as", "from", "up", "out",
]);

// Generic classifier nouns that routinely appear in both a clue and its answer
// ("this DYNASTY…" → "the Qin Dynasty"). Their presence alone is not a leak.
const GENERIC_WORDS = new Set([
  "dynasty", "empire", "kingdom", "war", "battle", "treaty", "act", "law", "effect",
  "theory", "principle", "prize", "award", "movement", "era", "age", "period",
  "king", "queen", "prince", "princess", "emperor", "president", "city", "town",
  "river", "ocean", "sea", "lake", "mountain", "mountains", "island", "islands",
  "desert", "strait", "canal", "cell", "gland", "organ", "system", "disease",
  "syndrome", "bank", "company", "brothers", "sisters", "family", "party",
  "molecule", "molecules", "telescope", "radiation", "pastry", "dough", "amendment",
  "championship", "championships", "order", "reaction", "process", "street", "executive",
]);

const VOLATILE_PATTERNS = [
  /\bmost[- ](visited|populous|watched|streamed|popular|valuable|expensive)\b/i,
  /\blongest[- ]reigning\b/i,
  /\bbest[- ]selling\b/i,
  /\bworld's (richest|highest[- ]paid)\b/i,
  /\bsecond[- ]largest\b/i,
  /\b(currently|as of today|right now)\b/i,
  /\bthe current\b/i,
  /\bstill the\b/i,
  /\breigning (world champion|defending champion)\b/i,
  /\brecord for the most\b/i,
];

/** Collapses a clue to its board-wide de-duplication key (mirrors clueCatalog.ts). */
export function dedupeKey(clue) {
  if (clue.topic && clue.topic.trim()) {
    return `topic:${clue.topic.trim().toLowerCase()}`;
  }
  let answer = String(clue.answer).toLowerCase();
  const paren = answer.indexOf("(");
  if (paren > 0) answer = answer.slice(0, paren);
  answer = answer
    .split(/\bor\b/)[0]
    .replace(/^\s*(the|a|an)\s+/, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return `answer:${answer}`;
}

/** Significant (content) words of the answer, lowercased. */
export function answerTokens(answer) {
  let text = String(answer).toLowerCase();
  const paren = text.indexOf("(");
  if (paren > 0) text = text.slice(0, paren);
  text = text.split(/\bor\b/)[0];
  return text
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

/**
 * Classifies how much of the answer leaks into the clue text.
 *  - "full": every significant answer word appears in the question (hard error)
 *  - "partial": the longest *distinctive* answer word (5+ chars) appears (warning)
 *  - "none"  (only generic classifier words like "this river" echo — normal phrasing)
 */
export function answerLeak(question, answer) {
  const q = ` ${String(question).toLowerCase()} `;
  const tokens = answerTokens(answer);
  if (tokens.length === 0) return "none";
  const present = tokens.filter((t) => q.includes(t));
  const distinctive = tokens.filter((t) => !GENERIC_WORDS.has(t));
  // "Full" only when every distinctive answer word is in the clue.
  if (present.length === tokens.length && distinctive.some((t) => q.includes(t))) {
    return "full";
  }
  const longestDistinctive = [...distinctive].sort((a, b) => b.length - a.length)[0];
  if (longestDistinctive && longestDistinctive.length >= 5 && q.includes(longestDistinctive)) {
    return "partial";
  }
  return "none";
}

export function looksVolatile(question) {
  return VOLATILE_PATTERNS.some((re) => re.test(question));
}
