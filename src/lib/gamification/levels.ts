/**
 * Level curve. Each level costs 100 XP more than the last, so the total to
 * reach level L is 50 * L * (L - 1):
 *
 *   L2 = 100    L5 = 1,000    L10 = 4,500    L25 = 30,000    L50 = 122,500
 *
 * Named ranks come from the spec; every other level inherits the last rank
 * it passed.
 */

export const RANKS: { level: number; title: string }[] = [
  { level: 1, title: "Beginner" },
  { level: 5, title: "Explorer" },
  { level: 10, title: "Builder" },
  { level: 25, title: "Power User" },
  { level: 50, title: "AI Master" },
];

export const MAX_LEVEL = 99;

/** Total XP required to have reached a given level. */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  return 50 * l * (l - 1);
}

export function levelForXp(xp: number): number {
  const safe = Math.max(0, Math.floor(xp));
  // Invert 50L(L-1) = xp  ->  L = (1 + sqrt(1 + xp/12.5)) / 2
  const level = Math.floor((1 + Math.sqrt(1 + safe / 12.5)) / 2);
  return Math.max(1, Math.min(MAX_LEVEL, level));
}

export function rankTitle(level: number): string {
  let title = RANKS[0].title;
  for (const rank of RANKS) if (level >= rank.level) title = rank.title;
  return title;
}

export interface LevelProgress {
  level: number;
  title: string;
  totalXp: number;
  /** XP earned inside the current level. */
  intoLevel: number;
  /** XP the current level costs end to end. */
  levelSpan: number;
  xpToNext: number;
  isMax: boolean;
}

export function levelProgress(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp));
  const level = levelForXp(xp);
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  const isMax = level >= MAX_LEVEL;

  return {
    level,
    title: rankTitle(level),
    totalXp: xp,
    intoLevel: xp - floor,
    levelSpan: isMax ? 0 : ceiling - floor,
    xpToNext: isMax ? 0 : ceiling - xp,
    isMax,
  };
}
