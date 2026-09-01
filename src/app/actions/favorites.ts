"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { recordAction } from "@/lib/gamification/award";

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** Set when the action failed because nobody is signed in. */
  needsAuth?: boolean;
  /** Present when the action earned something worth celebrating. */
  reward?: {
    xp: number;
    totalXp: number;
    streak: number;
    questCompleted: boolean;
    unlocked: string[];
  };
}

/** Registry ids look like "owner/repo" or "owner/repo/skill". */
function validSkillId(id: unknown): id is string {
  return typeof id === "string" && /^[\w.@-]+(\/[\w.@-]+){1,3}$/.test(id) && id.length <= 200;
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Adds or removes a favorite. Ownership is enforced twice: the action refuses
 * without a session, and row level security rejects any row whose user_id is
 * not the caller — so a forged request cannot touch another account.
 */
export async function toggleFavorite(input: {
  skillId: string;
  skillName: string;
  skillSource: string;
  favorited: boolean;
}): Promise<ActionResult> {
  if (!validSkillId(input.skillId)) {
    return { ok: false, error: "That skill id is not valid." };
  }

  const user = await getUser();
  if (!user) return { ok: false, needsAuth: true, error: "Sign in to save favorites." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Accounts are not configured." };

  if (input.favorited) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("skill_id", input.skillId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("favorites").insert({
      user_id: user.id,
      skill_id: input.skillId,
      skill_name: clean(input.skillName, 200) || input.skillId,
      skill_source: clean(input.skillSource, 120) || "unknown",
    });
    // Racing double-taps land here; the row already exists, which is the
    // outcome the user wanted.
    if (error && error.code !== "23505") return { ok: false, error: error.message };

    // XP is minted here, inside the action that did the deed — never from a
    // client-callable endpoint.
    const outcome = await recordAction(supabase, "skill_favorited", input.skillId);
    revalidatePath("/favorites");
    revalidatePath("/profile");
    return {
      ok: true,
      reward: outcome.awarded
        ? {
            xp: 2,
            totalXp: outcome.totalXp,
            streak: outcome.currentStreak,
            questCompleted: outcome.questCompleted,
            unlocked: outcome.unlocked,
          }
        : undefined,
    };
  }

  revalidatePath("/favorites");
  return { ok: true };
}
