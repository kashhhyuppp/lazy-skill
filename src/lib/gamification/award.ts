import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { XP, questForDate, type XpKind } from "./rules";
import { levelForXp } from "./levels";

/**
 * The server-side half of the XP system.
 *
 * These helpers are only ever called from inside the server action that
 * performs the underlying deed. There is no route or action that grants XP on
 * its own, and `award_xp` attributes every event to `auth.uid()` rather than a
 * parameter — so a client cannot mint points or award them to someone else.
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
 * the user actually asked for.
 */
export async function recordAction(
  supabase: SupabaseClient,
  kind: XpKind,
  subjectId: string | null
): Promise<AwardOutcome> {
  try {
    const { data, error } = await supabase.rpc("award_xp", {
      p_kind: kind,
      p_amount: XP[kind],
      p_subject_id: subjectId,
    });
    if (error) return EMPTY;

    const row = Array.isArray(data) ? data[0] : data;
    const outcome: AwardOutcome = {
      awarded: Boolean(row?.awarded),
      totalXp: Number(row?.total_xp ?? 0),
      currentStreak: Number(row?.current_streak ?? 0),
      questCompleted: false,
      unlocked: [],
    };

    // A repeat action still counts for the streak, but must not advance a
    // quest — otherwise re-favouriting one skill would finish "favorite 5".
    if (outcome.awarded) {
      outcome.questCompleted = await advanceTodaysQuest(supabase, kind);
    }

    outcome.unlocked = await syncAchievements(supabase, outcome);
    return outcome;
  } catch {
    return EMPTY;
  }
}

async function advanceTodaysQuest(supabase: SupabaseClient, kind: XpKind): Promise<boolean> {
  const quest = questForDate();
  if (quest.kind !== kind) return false;

  const { data, error } = await supabase.rpc("advance_quest", {
    p_quest_code: quest.code,
    p_target: quest.target,
    p_reward: XP.quest_completed,
  });
  if (error) return false;

  const row = Array.isArray(data) ? data[0] : data;
  return Boolean(row?.completed);
}

/**
 * Evaluates the achievements whose conditions are cheap to check from state we
 * already have. Unlocking is idempotent, so re-running is harmless.
 */
async function syncAchievements(
  supabase: SupabaseClient,
  outcome: AwardOutcome
): Promise<string[]> {
  const earned: string[] = [];

  const unlock = async (code: string) => {
    const { data } = await supabase.rpc("unlock_achievement", { p_code: code });
    if (data === true) earned.push(code);
  };

  if (outcome.currentStreak >= 7) await unlock("on_fire");
  if (levelForXp(outcome.totalXp) >= 25) await unlock("power_user");

  const { count } = await supabase
    .from("collections")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) >= 3) await unlock("collector");

  return earned;
}
