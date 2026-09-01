import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CollectionSkillRow, CollectionWithCount } from "./types";

export async function listCollections(): Promise<CollectionWithCount[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("collections")
    .select("*, collection_skills(count)")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const { collection_skills, ...rest } = row as typeof row & {
      collection_skills: { count: number }[];
    };
    return { ...rest, item_count: collection_skills?.[0]?.count ?? 0 } as CollectionWithCount;
  });
}

export async function getCollection(id: string) {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("collections")
    .select("*, collection_skills(*)")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const { collection_skills, ...collection } = data as typeof data & {
    collection_skills: CollectionSkillRow[];
  };
  return {
    collection,
    items: [...(collection_skills ?? [])].sort((a, b) => a.position - b.position),
  };
}
