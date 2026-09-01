import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface InstallHistoryRow {
  id: string;
  skillId: string;
  skillName: string;
  agentId: string;
  status: string;
  error: string | null;
  deviceName: string | null;
  createdAt: string;
}

/** Recent installs across all of the user's devices. */
export async function listInstallations(limit = 30): Promise<InstallHistoryRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("installations")
    .select("id, skill_id, skill_name, agent_id, status, error, created_at, devices(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];

  return (data ?? []).map((row) => {
    const device = row.devices as { name?: string } | { name?: string }[] | null;
    const deviceName = Array.isArray(device) ? device[0]?.name : device?.name;
    return {
      id: String(row.id),
      skillId: String(row.skill_id),
      skillName: String(row.skill_name),
      agentId: String(row.agent_id),
      status: String(row.status),
      error: (row.error as string | null) ?? null,
      deviceName: deviceName ?? null,
      createdAt: String(row.created_at),
    };
  });
}
