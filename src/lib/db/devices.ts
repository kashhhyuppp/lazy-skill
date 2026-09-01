import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface DeviceRow {
  id: string;
  name: string;
  platform: string;
  osVersion: string | null;
  detectedAgents: string[];
  theme: string;
  lastSeenAt: string;
  createdAt: string;
  /** True while the CLI has checked in recently enough to call it live. */
  online: boolean;
}

/** A device that has not checked in for this long is shown as offline. */
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export async function listDevices(): Promise<DeviceRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  // Revoked devices are excluded here rather than filtered in the UI, so a
  // disconnected machine can never appear connected.
  const { data, error } = await supabase
    .from("devices")
    .select("id, name, platform, os_version, detected_agents, theme, last_seen_at, created_at")
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) return [];

  const now = Date.now();
  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    platform: String(row.platform),
    osVersion: (row.os_version as string | null) ?? null,
    detectedAgents: Array.isArray(row.detected_agents) ? (row.detected_agents as string[]) : [],
    theme: String(row.theme),
    lastSeenAt: String(row.last_seen_at),
    createdAt: String(row.created_at),
    online: now - new Date(String(row.last_seen_at)).getTime() < ONLINE_WINDOW_MS,
  }));
}

export interface InstallationRow {
  id: string;
  skillId: string;
  skillName: string;
  agentId: string;
  status: string;
  createdAt: string;
}

export async function listDeviceInstallations(deviceId: string): Promise<InstallationRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("installations")
    .select("id, skill_id, skill_name, agent_id, status, created_at")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return [];

  return (data ?? []).map((row) => ({
    id: String(row.id),
    skillId: String(row.skill_id),
    skillName: String(row.skill_name),
    agentId: String(row.agent_id),
    status: String(row.status),
    createdAt: String(row.created_at),
  }));
}
