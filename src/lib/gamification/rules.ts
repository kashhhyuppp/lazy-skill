import type { LucideIcon } from "lucide-react";
import { Bot, Flame, Library, Target, Trophy, Zap } from "lucide-react";

/**
 * XP amounts, achievements and quests.
 *
 * Several rules in the original spec depend on data or features that do not
 * exist yet — installs arrive in Phase 8, and the live registry publishes no
 * category taxonomy at all (see Phase 2 notes). Those rules are defined here
 * but carry `available: false`, so the UI can show them as "not yet earnable"
 * instead of dangling a goal nobody can reach.
 */

export const XP = {
  skill_installed: 10,
  skill_favorited: 2,
  collection_created: 10,
  category_explored: 5,
  quest_completed: 100,
} as const;

export type XpKind = keyof typeof XP;

export interface AchievementDef {
  code: string;
  name: string;
  hint: string;
  icon: LucideIcon;
  /** False while the triggering feature does not exist yet. */
  available: boolean;
  /** Shown in place of the hint when unavailable. */
  blockedBy?: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    code: "first_skill",
    name: "First Skill",
    hint: "Install your first skill",
    icon: Trophy,
    available: false,
    blockedBy: "Needs remote install",
  },
  {
    code: "on_fire",
    name: "On Fire",
    hint: "Hit a 7 day streak",
    icon: Flame,
    available: true,
  },
  {
    code: "collector",
    name: "Collector",
    hint: "Build 3 collections",
    icon: Library,
    available: true,
  },
  {
    code: "ai_explorer",
    name: "AI Explorer",
    hint: "Install for 2 different agents",
    icon: Bot,
    available: false,
    blockedBy: "Needs remote install",
  },
  {
    code: "power_user",
    name: "Power User",
    hint: "Reach level 25",
    icon: Zap,
    available: true,
  },
  {
    code: "explorer",
    name: "Explorer",
    hint: "Visit every category",
    icon: Target,
    available: false,
    blockedBy: "Source has no categories",
  },
];

export const ACHIEVEMENT_BY_CODE = new Map(ACHIEVEMENTS.map((a) => [a.code, a]));

export interface QuestDef {
  code: string;
  label: string;
  target: number;
  /** Which action advances it. */
  kind: XpKind;
  available: boolean;
}

export const QUESTS: QuestDef[] = [
  { code: "favorite_5", label: "Favorite 5 skills", target: 5, kind: "skill_favorited", available: true },
  { code: "collection_1", label: "Create a collection", target: 1, kind: "collection_created", available: true },
  { code: "install_3", label: "Install 3 skills", target: 3, kind: "skill_installed", available: false },
  { code: "explore_2", label: "Explore 2 categories", target: 2, kind: "category_explored", available: false },
];

/**
 * Today's quest, chosen deterministically from the earnable set so every
 * client and the server agree without storing a schedule.
 */
export function questForDate(date = new Date()): QuestDef {
  const earnable = QUESTS.filter((q) => q.available);
  const day = Math.floor(date.getTime() / 86_400_000);
  return earnable[day % earnable.length];
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
