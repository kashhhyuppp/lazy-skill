"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import type { ActionResult } from "./favorites";
import { recordAction } from "@/lib/gamification/award";

const NAME_MAX = 60;
const DESC_MAX = 280;

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

export async function createCollection(input: {
  name: string;
  description?: string;
}): Promise<ActionResult & { id?: string }> {
  const name = clean(input.name, NAME_MAX);
  if (!name) return { ok: false, error: "Give the collection a name." };

  const user = await getUser();
  if (!user) return { ok: false, needsAuth: true, error: "Sign in to make collections." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Accounts are not configured." };

  const { data, error } = await supabase
    .from("collections")
    .insert({
      user_id: user.id,
      name,
      description: clean(input.description, DESC_MAX) || null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  const id = data.id as string;
  const outcome = await recordAction(supabase, "collection_created", id);

  revalidatePath("/library");
  revalidatePath("/profile");
  return {
    ok: true,
    id,
    reward: outcome.awarded
      ? {
          xp: 10,
          totalXp: outcome.totalXp,
          streak: outcome.currentStreak,
          questCompleted: outcome.questCompleted,
          unlocked: outcome.unlocked,
        }
      : undefined,
  };
}

export async function renameCollection(input: {
  id: string;
  name: string;
  description?: string;
}): Promise<ActionResult> {
  if (!isUuid(input.id)) return { ok: false, error: "Unknown collection." };
  const name = clean(input.name, NAME_MAX);
  if (!name) return { ok: false, error: "Give the collection a name." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Accounts are not configured." };

  // No user_id filter needed — row level security scopes the update to the
  // caller, and a mismatched row simply matches nothing.
  const { error } = await supabase
    .from("collections")
    .update({ name, description: clean(input.description, DESC_MAX) || null })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/library");
  revalidatePath(`/collections/${input.id}`);
  return { ok: true };
}

export async function deleteCollection(id: string): Promise<ActionResult> {
  if (!isUuid(id)) return { ok: false, error: "Unknown collection." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Accounts are not configured." };

  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/library");
  return { ok: true };
}

export async function setCollectionVisibility(input: {
  id: string;
  isPublic: boolean;
}): Promise<ActionResult> {
  if (!isUuid(input.id)) return { ok: false, error: "Unknown collection." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Accounts are not configured." };

  const { error } = await supabase
    .from("collections")
    .update({ is_public: Boolean(input.isPublic) })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/library");
  revalidatePath(`/collections/${input.id}`);
  return { ok: true };
}

export async function addSkillToCollection(input: {
  collectionId: string;
  skillId: string;
  skillName: string;
  skillSource: string;
}): Promise<ActionResult> {
  if (!isUuid(input.collectionId)) return { ok: false, error: "Unknown collection." };

  const user = await getUser();
  if (!user) return { ok: false, needsAuth: true, error: "Sign in to use collections." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Accounts are not configured." };

  // Append: read the current tail rather than assuming a count.
  const { data: last } = await supabase
    .from("collection_skills")
    .select("position")
    .eq("collection_id", input.collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("collection_skills").insert({
    collection_id: input.collectionId,
    skill_id: input.skillId,
    skill_name: clean(input.skillName, 200) || input.skillId,
    skill_source: clean(input.skillSource, 120) || "unknown",
    position: ((last?.position as number | undefined) ?? -1) + 1,
  });

  if (error && error.code !== "23505") return { ok: false, error: error.message };

  revalidatePath("/library");
  revalidatePath(`/collections/${input.collectionId}`);
  return { ok: true };
}

export async function removeSkillFromCollection(input: {
  collectionId: string;
  skillId: string;
}): Promise<ActionResult> {
  if (!isUuid(input.collectionId)) return { ok: false, error: "Unknown collection." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Accounts are not configured." };

  const { error } = await supabase
    .from("collection_skills")
    .delete()
    .eq("collection_id", input.collectionId)
    .eq("skill_id", input.skillId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/collections/${input.collectionId}`);
  return { ok: true };
}
