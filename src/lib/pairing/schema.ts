import { AGENT_IDS, type AgentId } from "@/types/skill";
import { isThemeId, DEFAULT_THEME, type ThemeId } from "@/lib/themes";

/**
 * Validators for everything the CLI sends. The CLI is not trusted: it runs on
 * a machine we do not control, so every field is checked and clamped here
 * rather than assumed well-formed.
 */

export const PLATFORMS = ["darwin", "win32", "linux", "unknown"] as const;
export type Platform = (typeof PLATFORMS)[number];

export function parsePlatform(value: unknown): Platform {
  return (PLATFORMS as readonly string[]).includes(value as string)
    ? (value as Platform)
    : "unknown";
}

export function parseDeviceName(value: unknown): string {
  const name = typeof value === "string" ? value.trim().slice(0, 80) : "";
  return name || "Unnamed device";
}

export function parseOsVersion(value: unknown): string | null {
  const v = typeof value === "string" ? value.trim().slice(0, 60) : "";
  return v || null;
}

export function parseTheme(value: unknown): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME;
}

/**
 * Detected agents. Only ids we know are kept — an unrecognised agent is
 * dropped rather than displayed, so the UI can never claim a tool is ready
 * because the CLI said an arbitrary string.
 */
export function parseDetectedAgents(value: unknown): AgentId[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<AgentId>();
  for (const entry of value.slice(0, 20)) {
    if ((AGENT_IDS as readonly string[]).includes(entry as string)) {
      seen.add(entry as AgentId);
    }
  }
  return [...seen];
}

/** Pairing codes are 32 random bytes, base64url encoded. */
export function isCodeShaped(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{40,64}$/.test(value);
}

export function isDeviceTokenShaped(value: unknown): value is string {
  return typeof value === "string" && /^lsk_[A-Za-z0-9_-]{40,64}$/.test(value);
}
