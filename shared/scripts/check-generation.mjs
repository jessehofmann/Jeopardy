#!/usr/bin/env node
// Behavioural checks on board generation: cross-category de-dup (#1), group
// exclusivity (#2), and Daily Double counts. Run via `npm test`.

import { clueDedupeKey } from "../src/data/clueCatalog.ts";
import * as catalog from "../src/data/clueCatalog.ts";
import round1Bank from "../src/data/catalog/round1.json" with { type: "json" };
import round2Bank from "../src/data/catalog/round2.json" with { type: "json" };

const failures = [];
const check = (cond, msg) => {
  if (!cond) failures.push(msg);
};

const groupOf = (round, id) =>
  (round === 1 ? round1Bank : round2Bank).find((c) => c.id === id)?.group;

const SEEDS = Array.from({ length: 400 }, (_, i) => `seed-${i}-${(i * 2654435761) % 100000}`);

for (const seed of SEEDS) {
  for (const count of [5, 6]) {
    const { round1, round2 } = catalog.generateGameCatalogs({ seed, categoryCount: count });

    for (const [round, board] of [[1, round1], [2, round2]]) {
      // #1 — no repeated answer / topic anywhere on the board
      const seen = new Map();
      for (const cat of board) {
        for (const clue of cat.clues) {
          const key = clueDedupeKey(clue);
          if (seen.has(key)) {
            failures.push(
              `seed "${seed}" R${round}: repeated ${key} (${seen.get(key)} + ${cat.name})`
            );
          }
          seen.set(key, cat.name);
        }
      }

      // #2 — never two categories from the same group
      const groups = board
        .map((cat) => groupOf(round, cat.id.replace(`r${round}-`, "")))
        .filter(Boolean);
      check(
        groups.length === new Set(groups).size,
        `seed "${seed}" R${round}: two categories from the same group (${groups.join(", ")})`
      );

      // Daily Doubles
      const dd = board.flatMap((c) => c.clues).filter((c) => c.isDailyDouble).length;
      check(dd === (round === 1 ? 1 : 2), `seed "${seed}" R${round}: ${dd} daily doubles`);

      check(board.length === count, `seed "${seed}" R${round}: ${board.length} categories, expected ${count}`);
    }
  }
}

// Exclude lists still steer clue choice.
{
  const base = catalog.generateRound1Catalog({ seed: "excl", categoryCount: 6 });
  const excludeIds = base.flatMap((c) => c.clues.map((cl) => cl.id));
  const next = catalog.generateRound1Catalog({ seed: "excl", categoryCount: 6, excludeClueIds: excludeIds });
  const overlap = next
    .flatMap((c) => c.clues)
    .filter((cl) => excludeIds.includes(cl.id)).length;
  check(overlap === 0, `exclude list ignored: ${overlap} clues reused`);
}

if (failures.length) {
  const shown = failures.slice(0, 20);
  for (const f of shown) console.error(`  ERROR ${f}`);
  if (failures.length > shown.length) console.error(`  … and ${failures.length - shown.length} more`);
  console.log(`\ngeneration: ${failures.length} failure(s) across ${SEEDS.length} seeds — FAIL`);
  process.exit(1);
}
console.log(`generation: ok (${SEEDS.length} seeds × counts 5,6 × 2 rounds)`);
