/**
 * The reward rules exist twice: in TypeScript for the UI, and in SQL as the
 * authority that actually grants points.
 *
 * Duplication is deliberate — the database must not trust a number the client
 * sends — but a silent divergence would show a user one goal and pay out
 * another. This test reads both copies and fails if they disagree.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { XP, QUESTS, ACHIEVEMENTS } from "../src/lib/gamification/rules.ts";
import { xpForLevel } from "../src/lib/gamification/levels.ts";

const sql = readFileSync(new URL("../supabase/migrations/0006_security_review.sql", import.meta.url), "utf8");

let checks = 0;
const check = (label: string, fn: () => void) => {
  fn();
  checks++;
  console.log("  ok  " + label);
};

/** Pulls the tuple rows out of one `insert into <table> ... values (...)` block. */
function seededRows(table: string): string[][] {
  const block = new RegExp(`insert into public\\.${table}[^;]*?values([\\s\\S]*?);`, "i").exec(sql);
  assert.ok(block, `no seed found for ${table}`);
  // Stop at the conflict clause, whose own parenthesised column list would
  // otherwise be read as one more seeded row.
  const values = block[1].split(/on conflict/i)[0];
  return [...values.matchAll(/\(([^()]*)\)/g)].map((m) =>
    m[1].split(",").map((cell) => cell.trim().replace(/^'|'$/g, ""))
  );
}

check("every XP amount matches the seeded xp_rules", () => {
  const seeded = new Map(seededRows("xp_rules").map(([kind, amount]) => [kind, Number(amount)]));
  assert.equal(seeded.size, Object.keys(XP).length, "the two sets have different sizes");
  for (const [kind, amount] of Object.entries(XP)) {
    assert.equal(seeded.get(kind), amount, `${kind}: TypeScript says ${amount}, SQL says ${seeded.get(kind)}`);
  }
});

check("every quest matches the seeded quest_rules", () => {
  const seeded = new Map(
    seededRows("quest_rules").map(([code, kind, target, reward, available, order]) => [
      code,
      { kind, target: Number(target), reward: Number(reward), available: available === "true", order: Number(order) },
    ])
  );
  assert.equal(seeded.size, QUESTS.length, "the two quest sets have different sizes");
  for (const quest of QUESTS) {
    const row = seeded.get(quest.code);
    assert.ok(row, `${quest.code} is missing from the SQL seed`);
    assert.equal(row.kind, quest.kind, `${quest.code}: kind`);
    assert.equal(row.target, quest.target, `${quest.code}: target`);
    assert.equal(row.available, quest.available, `${quest.code}: available`);
    assert.equal(row.reward, XP.quest_completed, `${quest.code}: reward should be the quest_completed award`);
  }
});

check("today's quest is picked from the same ordered set on both sides", () => {
  // questForDate() takes the available quests in array order and indexes by
  // the day number; todays_quest() orders by sort_order and does the same. The
  // two only agree if sort_order follows the array.
  const seeded = seededRows("quest_rules")
    .map(([code, , , , available, order]) => ({ code, available: available === "true", order: Number(order) }))
    .sort((a, b) => a.order - b.order);

  assert.deepEqual(
    seeded.map((r) => r.code),
    QUESTS.map((q) => q.code),
    "sort_order must follow the QUESTS array, or the two sides schedule different quests"
  );
  assert.deepEqual(
    seeded.filter((r) => r.available).map((r) => r.code),
    QUESTS.filter((q) => q.available).map((q) => q.code),
    "the earnable subsets differ"
  );
});

check("every achievement code exists in achievement_rules", () => {
  const seeded = new Set(seededRows("achievement_rules").map(([code]) => code));
  assert.equal(seeded.size, ACHIEVEMENTS.length, "the two achievement sets have different sizes");
  for (const a of ACHIEVEMENTS) {
    assert.ok(seeded.has(a.code), `${a.code} is missing from achievement_rules`);
  }
});

check("the level-25 threshold in SQL matches the level curve", () => {
  // award_xp hard-codes the XP for level 25 rather than reimplementing the
  // curve, so the constant has to track levels.ts.
  const threshold = /v_total >= (\d+)/.exec(sql);
  assert.ok(threshold, "no power_user threshold found in award_xp");
  assert.equal(
    Number(threshold[1]),
    xpForLevel(25),
    `SQL uses ${threshold[1]} but xpForLevel(25) is ${xpForLevel(25)}`
  );
});

check("the reward functions a client could abuse are revoked", () => {
  for (const fn of ["claim_next_job(uuid)", "purge_expired_pairings()", "expire_stale_jobs()"]) {
    const pattern = new RegExp(`revoke all on function public\\.${fn.replace(/[()]/g, "\\$&")} from public, anon, authenticated`);
    assert.match(sql, pattern, `${fn} must be revoked from anon and authenticated`);
  }
  assert.match(sql, /drop function if exists public\.advance_quest/, "advance_quest must be dropped");
  assert.match(sql, /drop function if exists public\.unlock_achievement/, "unlock_achievement must be dropped");
  assert.match(sql, /revoke all on function public\.award_xp\(text, text\) from public, anon/, "award_xp must be denied to anon");
});

check("award_xp verifies the deed for every subject-bearing kind", () => {
  for (const [kind, table] of [
    ["skill_favorited", "favorites"],
    ["collection_created", "collections"],
    ["skill_installed", "installations"],
  ]) {
    const branch = new RegExp(`p_kind = '${kind}'[\\s\\S]{0,400}?from public\\.${table}`);
    assert.match(sql, branch, `${kind} must be checked against public.${table}`);
  }
});

console.log(`\n${checks} checks passed\n`);
