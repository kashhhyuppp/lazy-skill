import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { XpKind } from "./rules";

/**
 * The server-side half of the XP system.
 *
 * `award_xp` is the only reward function a client can reach, and it decides
 * everything itself: the amount comes from `xp_rules`, the quest from
 * `todays_quest()`, and achievements from stored state. The caller says only
 * *what happened* and *to which subject*, and the database refuses the award
 * outright if no such favorite, collection or installation exists for that
 * user.
 *
 * It used to take the amount as a parameter, with `advance_quest` and
 * `unlock_achievement` exposed alongside it. Since those are `security
 * definer` functions granted to `authenticated`, a signed-in user could call
 * them straight from devtools: the security review confirmed 2,500 XP and the
 * top leaderboard place from 25 calls with invented subject ids, plus badges
 * for codes that do not exist. Both helpers are now folded in here and
 * revoked, so the only way to earn is to do the thing.
 */

export interface AwardOutcome {
  awarded: boolean;
  totalXp: number;
  currentStreak: number;
  questCompleted: boolean;
  unlocked: string[];
}

const EMPTY: AwardOutcome = {
  awarded: false,
  totalXp: 0,
  currentStreak: 0,
  questCompleted: false,
  unlocked: [],
};

/**
 * Records an earned action: XP, streak, today's quest, and any achievement it
 * unlocks. Never throws — a points failure must not roll back the favorite
 * the user actually asked for, and a rejected award is a normal outcome now
 * that the database verifies the deed.
 */
export async function recordAction(
  supabase: SupabaseClient,
  kind: XpKind,
  subjectId: string | null
): Promise<AwardOutcome> {
  try {
    const { data, error } = await supabase.rpc("award_xp", {
      p_kind: kind,
      p_subject_id: subjectId,
    });
    if (error) return EMPTY;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return EMPTY;

    return {
      awarded: Boolean(row.awarded),
      totalXp: Number(row.total_xp ?? 0),
      currentStreak: Number(row.current_streak ?? 0),
      questCompleted: Boolean(row.quest_completed),
      unlocked: Array.isArray(row.unlocked) ? (row.unlocked as string[]) : [],
    };
  } catch {
    return EMPTY;
  }
}
