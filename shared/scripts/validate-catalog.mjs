#!/usr/bin/env node
// Static validation of the clue catalog JSON. Run via `npm test` (root or shared/).
//   node scripts/validate-catalog.mjs           errors fail the build; warnings print
//   node scripts/validate-catalog.mjs --strict  warnings fail the build too

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  ROUND_VALUES,
  MIN_OPTIONS_PER_SLOT,
  dedupeKey,
  answerLeak,
  looksVolatile,
} from "./catalog-rules.mjs";

const strict = process.argv.includes("--strict");
const dir = fileURLToPath(new URL("../src/data/catalog/", import.meta.url));
const load = (name) => JSON.parse(readFileSync(dir + name, "utf8"));

const errors = [];
const warnings = [];
const err = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

function checkClue(where, clue) {
  const q = typeof clue.question === "string" ? clue.question.trim() : "";
  const a = typeof clue.answer === "string" ? clue.answer.trim() : "";
  if (!q) err(`${where}: empty question`);
  if (!a) err(`${where}: empty answer`);
  if (!q || !a) return;

  if (q.endsWith("?")) err(`${where}: question is phrased as a question (ends with "?")`);
  if (/^(what|who|where|when|which)\s+(is|are|was|were)\b/i.test(a)) {
    err(`${where}: answer is phrased as a response ("${a}")`);
  }
  if (q.length < 25) warn(`${where}: very short question (${q.length} chars)`);
  if (q.length > 320) warn(`${where}: very long question (${q.length} chars)`);
  if (a.length > 120) warn(`${where}: very long answer (${a.length} chars)`);

  const leak = answerLeak(q, a);
  if (leak === "full") err(`${where}: answer "${a}" is fully contained in the clue`);
  else if (leak === "partial") warn(`${where}: answer "${a}" partly appears in the clue`);

  if (looksVolatile(q) && !clue.volatile) {
    warn(`${where}: time-sensitive wording but not marked "volatile": "${q.slice(0, 70)}…"`);
  }
}

function checkRound(round, categories) {
  const values = ROUND_VALUES[round].map(String);
  const ids = new Set();
  const boardKeys = new Map(); // dedupeKey -> [categoryName]

  for (const cat of categories) {
    const label = `R${round} ${cat.name || cat.id || "?"}`;
    if (!cat.id) err(`${label}: missing id`);
    if (!cat.name) err(`${label}: missing name`);
    if (cat.id && ids.has(cat.id)) err(`R${round}: duplicate category id "${cat.id}"`);
    ids.add(cat.id);

    const cbv = cat.cluesByValue || {};
    const keys = Object.keys(cbv);
    const missing = values.filter((v) => !keys.includes(v));
    const extra = keys.filter((v) => !values.includes(v));
    if (missing.length) err(`${label}: missing value slots ${missing.join(", ")}`);
    if (extra.length) err(`${label}: unexpected value slots ${extra.join(", ")}`);

    const catKeys = new Map();
    for (const v of values) {
      const options = cbv[v] || [];
      if (options.length === 0) {
        err(`${label} $${v}: no clue options`);
        continue;
      }
      if (options.length < MIN_OPTIONS_PER_SLOT) {
        warn(`${label} $${v}: only ${options.length} option(s) (want ${MIN_OPTIONS_PER_SLOT}+)`);
      }
      options.forEach((clue, i) => {
        checkClue(`${label} $${v} #${i}`, clue);
        const k = dedupeKey(clue);
        if (catKeys.has(k)) {
          err(`${label}: duplicate answer across slots ($${catKeys.get(k)} and $${v}): ${k}`);
        } else {
          catKeys.set(k, v);
        }
        if (!boardKeys.has(k)) boardKeys.set(k, []);
        boardKeys.get(k).push(cat.name);
      });
    }

    if (cat.group && typeof cat.group !== "string") err(`${label}: group must be a string`);
  }

  // Answers shared by 3+ categories in the same round crowd the pool — worth a look.
  for (const [k, cats] of boardKeys) {
    const uniq = [...new Set(cats)];
    if (uniq.length >= 3) {
      warn(`R${round}: "${k}" is an option in ${uniq.length} categories (${uniq.join(", ")})`);
    }
  }
}

function checkFinal(bank) {
  if (!Array.isArray(bank) || bank.length < 10) {
    err(`Final Jeopardy: expected a bank of 10+ clues, got ${bank?.length}`);
    return;
  }
  const keys = new Map();
  bank.forEach((clue, i) => {
    const where = `FJ #${i} (${clue.category || "?"})`;
    if (!clue.category || !String(clue.category).trim()) err(`${where}: missing category`);
    checkClue(where, clue);
    const k = dedupeKey(clue);
    if (keys.has(k)) warn(`Final Jeopardy: repeated answer "${k}" (#${keys.get(k)} and #${i})`);
    else keys.set(k, i);
  });
}

checkRound(1, load("round1.json"));
checkRound(2, load("round2.json"));
checkFinal(load("finalJeopardy.json"));

for (const w of warnings) console.warn(`  warn  ${w}`);
for (const e of errors) console.error(`  ERROR ${e}`);

const failed = errors.length > 0 || (strict && warnings.length > 0);
console.log(
  `\ncatalog: ${errors.length} error(s), ${warnings.length} warning(s)` +
    (failed ? " — FAIL" : " — ok")
);
process.exit(failed ? 1 : 0);
