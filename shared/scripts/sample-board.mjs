#!/usr/bin/env node
// Print a generated board to the terminal so new clue content can be
// eyeballed without launching the app.
//   node scripts/sample-board.mjs [seed] [--round 1|2] [--count 6]

import {
  generateRound1Catalog,
  generateRound2Catalog,
  pickFinalJeopardyClue,
} from "../src/data/clueCatalog.ts";

const args = process.argv.slice(2);
const seed = args.find((a) => !a.startsWith("--")) || `sample-${Date.now()}`;
const roundArg = args.includes("--round") ? args[args.indexOf("--round") + 1] : "1";
const countArg = args.includes("--count") ? parseInt(args[args.indexOf("--count") + 1], 10) : 6;
const round = roundArg === "2" ? 2 : 1;

const catalog =
  round === 2
    ? generateRound2Catalog({ seed, categoryCount: countArg })
    : generateRound1Catalog({ seed, categoryCount: countArg });

console.log(`\n  Round ${round} — seed "${seed}"\n  ${"═".repeat(60)}`);
for (const category of catalog) {
  console.log(`\n  ${category.name.toUpperCase()}`);
  for (const clue of category.clues) {
    const dd = clue.isDailyDouble ? "  ★ DAILY DOUBLE" : "";
    console.log(`   $${String(clue.value).padEnd(5)} ${clue.question}${dd}`);
    console.log(`          → ${clue.answer}`);
  }
}

const fj = pickFinalJeopardyClue(seed);
console.log(`\n  FINAL JEOPARDY — ${fj.category}`);
console.log(`   ${fj.question}`);
console.log(`   → ${fj.answer}\n`);
