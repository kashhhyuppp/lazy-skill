import "server-only";
import type { SkillsProvider } from "./types";
import { DemoSkillsProvider } from "./demo-provider";
import { SkillsShProvider } from "./skills-sh/provider";
import { isConfigured } from "./skills-sh/client";

export type { SkillsProvider, ProviderCapabilities } from "./types";

let cached: SkillsProvider | null = null;

/**
 * Resolves the active provider. Server-only: never import this from a client
 * component, so registry credentials can never reach the browser (§17/§49).
 *
 * Falls back to sample data when the registry is unconfigured, so the app runs
 * for anyone who clones it without a Vercel link — and so a missing token
 * surfaces as a visible "sample data" banner rather than a wall of 401s.
 */
export function getSkillsProvider(): SkillsProvider {
  if (!cached) {
    cached = isConfigured() ? new SkillsShProvider() : new DemoSkillsProvider();
  }
  return cached;
}

/** Client components need the capability flags but must not touch the provider. */
export function getProviderInfo() {
  const p = getSkillsProvider();
  return { id: p.id, label: p.label, isDemo: p.isDemo, capabilities: p.capabilities };
}

export type ProviderInfo = ReturnType<typeof getProviderInfo>;
