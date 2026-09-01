"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import type { ActionResult } from "./favorites";

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

export async function renameDevice(input: { id: string; name: string }): Promise<ActionResult> {
  if (!isUuid(input.id)) return { ok: false, error: "Unknown device." };

  const name = typeof input.name === "string" ? input.name.trim().slice(0, 80) : "";
  if (!name) return { ok: false, error: "Give the device a name." };

  const user = await getUser();
  if (!user) return { ok: false, needsAuth: true, error: "Sign in first." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Accounts are not configured." };

  // Row level security scopes this to the caller; a device belonging to
  // someone else simply matches nothing.
  const { error } = await supabase.from("devices").update({ name }).eq("id", input.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/devices");
  return { ok: true };
}

/**
 * Revokes a device. Marked rather than deleted, so installation history
 * survives and the device's token stops authenticating immediately.
 */
export async function revokeDevice(id: string): Promise<ActionResult> {
  if (!isUuid(id)) return { ok: false, error: "Unknown device." };

  const user = await getUser();
  if (!user) return { ok: false, needsAuth: true, error: "Sign in first." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Accounts are not configured." };

  const { error } = await supabase
    .from("devices")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/devices");
  return { ok: true };
}
