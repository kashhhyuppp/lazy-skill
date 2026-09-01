import "server-only";
import { createClient, getUser } from "@/lib/supabase/server";
import type { FavoriteRow } from "./types";

export async function listFavorites(): Promise<FavoriteRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("favorites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Just the ids, for seeding the client-side favorite buttons. Returns an empty
 * set when signed out so the UI renders identically for guests.
 */
export async function favoriteSkillIds(): Promise<string[]> {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("favorites").select("skill_id");
  if (error) return [];
  return (data ?? []).map((r) => r.skill_id as string);
}
