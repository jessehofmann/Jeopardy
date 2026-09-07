import type { Category } from "../types";
import round1Data from "./catalog/round1.json" with { type: "json" };
import round2Data from "./catalog/round2.json" with { type: "json" };
import finalJeopardyData from "./catalog/finalJeopardy.json" with { type: "json" };

type RoundNumber = 1 | 2;
type Round1Value = 200 | 400 | 600 | 800 | 1000;
type Round2Value = 400 | 800 | 1200 | 1600 | 2000;
type TierValue = Round1Value | Round2Value;

export interface ClueTemplate {
  question: string;
  answer: string;
  /** Optional explicit de-duplication key. Two clues that share a topic will never
   *  appear on the same board even if their answers are worded differently. */
  topic?: string;
  /** Marks a clue whose correctness depends on the passage of time (records,
   *  "current" office-holders, dated events). Surfaced by the catalog validator. */
  volatile?: boolean;
}

interface CategoryBank<V extends TierValue> {
  id: string;
  name: string;
  /** Categories that share a group are mutually exclusive within a single round,
   *  so near-twin categories (e.g. two classic-film categories) never both appear. */
  group?: string;
  cluesByValue: Record<V, ClueTemplate[]>;
}

interface GenerateRoundCatalogOptions {
  seed?: string;
  categoryCount?: number;
  excludeClueIds?: Iterable<string>;
}

interface GenerateGameCatalogsOptions {
  seed?: string;
  categoryCount?: number;
  round1ExcludeClueIds?: Iterable<string>;
  round2ExcludeClueIds?: Iterable<string>;
}

const ROUND_1_VALUES: Round1Value[] = [200, 400, 600, 800, 1000];
const ROUND_2_VALUES: Round2Value[] = [400, 800, 1200, 1600, 2000];
const DEFAULT_CATEGORY_COUNT = 5;

const round1Bank = round1Data as unknown as Array<CategoryBank<Round1Value>>;
const round2Bank = round2Data as unknown as Array<CategoryBank<Round2Value>>;

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed: string): () => number {
  let state = hashSeed(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const hold = next[index];
    next[index] = next[swapIndex];
    next[swapIndex] = hold;
  }
  return next;
}

function normalizeCategoryCount(count: number | undefined, max: number): number {
  if (!count || Number.isNaN(count)) {
    return Math.min(DEFAULT_CATEGORY_COUNT, max);
  }
  return Math.max(1, Math.min(Math.floor(count), max));
}

/** Collapses a clue to the key used for board-wide de-duplication. */
export function clueDedupeKey(template: ClueTemplate): string {
  if (template.topic && template.topic.trim()) {
    return `topic:${template.topic.trim().toLowerCase()}`;
  }
  let answer = template.answer.toLowerCase();
  const parenIndex = answer.indexOf("(");
  if (parenIndex > 0) {
    answer = answer.slice(0, parenIndex);
  }
  answer = answer
    .split(/\bor\b/)[0]
    .replace(/^\s*(the|a|an)\s+/, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return `answer:${answer}`;
}

/** Picks up to `count` categories, never taking two that share a `group`. */
function selectCategories<V extends TierValue>(
  bank: Array<CategoryBank<V>>,
  count: number,
  random: () => number
): Array<CategoryBank<V>> {
  const shuffled = shuffle(bank, random);
  const picked: Array<CategoryBank<V>> = [];
  const usedGroups = new Set<string>();

  for (const category of shuffled) {
    if (picked.length >= count) break;
    if (category.group && usedGroups.has(category.group)) continue;
    picked.push(category);
    if (category.group) usedGroups.add(category.group);
  }

  // If group constraints starved the selection, top up ignoring groups.
  if (picked.length < count) {
    for (const category of shuffled) {
      if (picked.length >= count) break;
      if (!picked.includes(category)) picked.push(category);
    }
  }

  return picked;
}

function pickTemplate(
  templates: ClueTemplate[],
  idsForValue: string[],
  excludedClueIds: Set<string>,
  usedDedupeKeys: Set<string>,
  random: () => number
): { template: ClueTemplate; optionIndex: number } {
  const candidates = templates
    .map((template, optionIndex) => ({ template, optionIndex }))
    .filter(({ optionIndex }) => !excludedClueIds.has(idsForValue[optionIndex]));

  const available =
    candidates.length > 0 ? candidates : templates.map((template, optionIndex) => ({ template, optionIndex }));

  // Prefer options that don't collide with a clue already placed on the board.
  const fresh = available.filter(({ template }) => !usedDedupeKeys.has(clueDedupeKey(template)));
  const pool = fresh.length > 0 ? fresh : available;

  return pool[Math.floor(random() * pool.length)];
}

function buildRoundCatalog<V extends TierValue>(
  round: RoundNumber,
  bank: Array<CategoryBank<V>>,
  values: V[],
  options: GenerateRoundCatalogOptions
): Category[] {
  const seed = options.seed?.trim() || `random-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const random = createRng(`round-${round}-${seed}`);
  const excludedClueIds = new Set(options.excludeClueIds || []);
  const count = normalizeCategoryCount(options.categoryCount, bank.length);
  const selectedCategories = selectCategories(bank, count, random);
  const usedDedupeKeys = new Set<string>();

  const builtCategories = selectedCategories.map((category) => {
    const clues = values.map((value) => {
      const templates = category.cluesByValue[value];
      const idsForValue = templates.map((_, optionIndex) => `r${round}-${category.id}-${value}-${optionIndex}`);
      const selection = pickTemplate(templates, idsForValue, excludedClueIds, usedDedupeKeys, random);
      usedDedupeKeys.add(clueDedupeKey(selection.template));

      return {
        id: `r${round}-${category.id}-${value}-${selection.optionIndex}`,
        value,
        question: selection.template.question,
        answer: selection.template.answer,
        isAnswered: false,
      };
    });

    return {
      id: `r${round}-${category.id}`,
      name: category.name,
      clues,
    };
  });

  // Pick 1 Daily Double in Round 1, 2 in Round 2, using the seeded RNG for determinism
  const ddCount = round === 1 ? 1 : 2;
  const totalClues = builtCategories.length * values.length;
  const allIndices = Array.from({ length: totalClues }, (_, i) => i);
  const ddIndices = new Set(shuffle(allIndices, random).slice(0, ddCount));

  return builtCategories.map((category, catIdx) => ({
    ...category,
    clues: category.clues.map((clue, clueIdx) => ({
      ...clue,
      isDailyDouble: ddIndices.has(catIdx * values.length + clueIdx),
    })),
  }));
}

export function generateRound1Catalog(options: GenerateRoundCatalogOptions = {}): Category[] {
  return buildRoundCatalog(1, round1Bank, ROUND_1_VALUES, options);
}

export function generateRound2Catalog(options: GenerateRoundCatalogOptions = {}): Category[] {
  return buildRoundCatalog(2, round2Bank, ROUND_2_VALUES, options);
}

export function generateGameCatalogs(options: GenerateGameCatalogsOptions = {}): {
  round1: Category[];
  round2: Category[];
} {
  const baseSeed = options.seed?.trim() || `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    round1: generateRound1Catalog({
      seed: `${baseSeed}-round1`,
      categoryCount: options.categoryCount,
      excludeClueIds: options.round1ExcludeClueIds,
    }),
    round2: generateRound2Catalog({
      seed: `${baseSeed}-round2`,
      categoryCount: options.categoryCount,
      excludeClueIds: options.round2ExcludeClueIds,
    }),
  };
}

// ─── Final Jeopardy ───────────────────────────────────────────────────────────

export interface FinalJeopardyClue {
  category: string;
  question: string;
  answer: string;
}

const finalJeopardyBank = finalJeopardyData as unknown as FinalJeopardyClue[];

export function pickFinalJeopardyClue(seed: string): FinalJeopardyClue {
  const random = createRng(`fj-${seed}`);
  return finalJeopardyBank[Math.floor(random() * finalJeopardyBank.length)];
}

const defaultCatalogs = generateGameCatalogs({ seed: "default-game-seed", categoryCount: DEFAULT_CATEGORY_COUNT });

export const round1Categories: Category[] = defaultCatalogs.round1;
export const round2Categories: Category[] = defaultCatalogs.round2;

export const round1Catalog = round1Categories;
export const round2Catalog = round2Categories;

// Raw banks — exported for the catalog validator and tooling, not for gameplay.
export const round1BankRaw = round1Bank;
export const round2BankRaw = round2Bank;
export const finalJeopardyBankRaw = finalJeopardyBank;
