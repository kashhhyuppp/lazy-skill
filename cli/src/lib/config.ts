import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { DEFAULT_THEME, isThemeId, type ThemeId } from "../ui/theme.js";

/**
 * Local config, including the device token.
 *
 * The token is a long-lived credential, so the file is written 0600 and the
 * directory 0700. Storing it in the home directory rather than the project
 * keeps it out of repositories and out of `npx` temp dirs that get wiped.
 */

export interface CliConfig {
  theme: ThemeId;
  deviceToken?: string;
  deviceId?: string;
  deviceName?: string;
  apiUrl?: string;
  connectedAt?: string;
}

const DIR = join(homedir(), ".lazyskill");
const FILE = join(DIR, "config.json");

const DEFAULTS: CliConfig = { theme: DEFAULT_THEME };

export function configPath(): string {
  return FILE;
}

/** True before the user has ever been asked anything. */
export function isFirstRun(): boolean {
  return !existsSync(FILE);
}

export function readConfig(): CliConfig {
  try {
    if (!existsSync(FILE)) return { ...DEFAULTS };
    const parsed = JSON.parse(readFileSync(FILE, "utf8")) as Partial<CliConfig>;
    return {
      ...DEFAULTS,
      ...parsed,
      // Never trust a hand-edited theme value into the rendering path.
      theme: isThemeId(parsed.theme) ? parsed.theme : DEFAULT_THEME,
    };
  } catch {
    // A corrupt config should not brick the CLI; fall back to defaults.
    return { ...DEFAULTS };
  }
}

export function writeConfig(config: CliConfig): void {
  mkdirSync(DIR, { recursive: true, mode: 0o700 });
  writeFileSync(FILE, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
  // mkdir/writeFile modes are subject to umask, so set them explicitly.
  try {
    chmodSync(DIR, 0o700);
    chmodSync(FILE, 0o600);
  } catch {
    // Windows has no POSIX modes; the file lives in the user profile anyway.
  }
}

export function updateConfig(patch: Partial<CliConfig>): CliConfig {
  const next = { ...readConfig(), ...patch };
  writeConfig(next);
  return next;
}

/** Forgets the device credential but keeps cosmetic preferences. */
export function clearCredentials(): void {
  const current = readConfig();
  writeConfig({ theme: current.theme, apiUrl: current.apiUrl });
}

export function forgetEverything(): void {
  try {
    rmSync(FILE, { force: true });
  } catch {
    // Nothing to forget.
  }
}

/**
 * Where the CLI pairs and polls by default.
 *
 * The deployment's own hostname, not a domain we do not own. A published CLI
 * pointing at an unregistered domain would send every user's pairing attempt
 * nowhere — or, worse, to whoever registers it later. Override with
 * LAZY_SKILL_API_URL when running against a local server.
 */
export const DEFAULT_API_URL = "https://lazy-skill.vercel.app";

export function apiBaseUrl(): string {
  const configured = readConfig().apiUrl ?? process.env.LAZY_SKILL_API_URL;
  return (configured || DEFAULT_API_URL).replace(/\/$/, "");
}
