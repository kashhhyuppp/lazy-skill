import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashSecret, isPairingConfigured } from "./tokens";
import { isDeviceTokenShaped } from "./schema";

export interface AuthedDevice {
  id: string;
  userId: string;
  name: string;
  platform: string;
  detectedAgents: string[];
  theme: string;
}

export interface DeviceAuthResult {
  device: AuthedDevice | null;
  supabase: SupabaseClient | null;
  /** Why authentication failed, for an accurate status code. */
  reason?: "unconfigured" | "missing" | "invalid" | "revoked";
}

/**
 * Authenticates a CLI request from its Bearer device token.
 *
 * The token is looked up by HMAC, so no plaintext token is stored and a
 * database leak yields nothing replayable. Revoked devices are rejected
 * explicitly rather than merely failing to match, so the CLI can tell the
 * user their device was disconnected instead of showing a generic error.
 */
export async function authenticateDevice(request: Request): Promise<DeviceAuthResult> {
  if (!isPairingConfigured()) return { device: null, supabase: null, reason: "unconfigured" };

  const supabase = createAdminClient();
  if (!supabase) return { device: null, supabase: null, reason: "unconfigured" };

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!isDeviceTokenShaped(token)) {
    return { device: null, supabase, reason: "missing" };
  }

  const { data } = await supabase
    .from("devices")
    .select("id, user_id, name, platform, detected_agents, theme, revoked_at")
    .eq("token_hash", hashSecret(token))
    .maybeSingle();

  if (!data) return { device: null, supabase, reason: "invalid" };
  if (data.revoked_at) return { device: null, supabase, reason: "revoked" };

  return {
    supabase,
    device: {
      id: String(data.id),
      userId: String(data.user_id),
      name: String(data.name),
      platform: String(data.platform),
      detectedAgents: Array.isArray(data.detected_agents)
        ? (data.detected_agents as string[])
        : [],
      theme: String(data.theme),
    },
  };
}

export function deviceAuthStatus(reason: DeviceAuthResult["reason"]): number {
  return reason === "unconfigured" ? 503 : reason === "revoked" ? 403 : 401;
}
