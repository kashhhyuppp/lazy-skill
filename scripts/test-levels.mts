import assert from "node:assert/strict";
import { levelForXp, levelProgress, rankTitle, xpForLevel } from "../src/lib/gamification/levels.ts";

let checks = 0;
const check = (label: string, fn: () => void) => {
  fn();
  checks++;
  console.log("  ok  " + label);
};

check("level 1 starts at 0 XP", () => assert.equal(xpForLevel(1), 0));
check("level 2 costs 100 XP", () => assert.equal(xpForLevel(2), 100));
check("level 5 is 1,000 XP", () => assert.equal(xpForLevel(5), 1000));
check("level 10 is 4,500 XP", () => assert.equal(xpForLevel(10), 4500));
check("level 25 is 30,000 XP", () => assert.equal(xpForLevel(25), 30000));
check("level 50 is 122,500 XP", () => assert.equal(xpForLevel(50), 122500));

check("levelForXp inverts xpForLevel exactly at every boundary", () => {
  for (let l = 1; l <= 99; l++) {
    assert.equal(levelForXp(xpForLevel(l)), l, `at level ${l}`);
    if (l > 1) {
      assert.equal(levelForXp(xpForLevel(l) - 1), l - 1, `one XP below level ${l}`);
    }
  }
});

check("negative and absurd XP never break the curve", () => {
  assert.equal(levelForXp(-500), 1);
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(Number.MAX_SAFE_INTEGER), 99);
});

check("ranks apply from their threshold upward", () => {
  assert.equal(rankTitle(1), "Beginner");
  assert.equal(rankTitle(4), "Beginner");
  assert.equal(rankTitle(5), "Explorer");
  assert.equal(rankTitle(9), "Explorer");
  assert.equal(rankTitle(10), "Builder");
  assert.equal(rankTitle(24), "Builder");
  assert.equal(rankTitle(25), "Power User");
  assert.equal(rankTitle(50), "AI Master");
  assert.equal(rankTitle(99), "AI Master");
});

check("progress never exceeds its own span", () => {
  for (let xp = 0; xp < 40000; xp += 37) {
    const p = levelProgress(xp);
    assert.ok(p.intoLevel >= 0, `intoLevel negative at ${xp}`);
    if (!p.isMax) {
      assert.ok(p.intoLevel < p.levelSpan, `intoLevel overflows span at ${xp}`);
      assert.ok(p.xpToNext > 0 && p.xpToNext <= p.levelSpan, `xpToNext out of range at ${xp}`);
    }
  }
});

check("max level reports no next level", () => {
  const p = levelProgress(xpForLevel(99) + 5000);
  assert.equal(p.isMax, true);
  assert.equal(p.xpToNext, 0);
});

console.log(`\n${checks} checks passed\n`);
