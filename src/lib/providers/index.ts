import "server-only";
import type { SkillsProvider } from "./types";
import { SkillsShProvider } from "./skills-sh/provider";
import { GuardedSkillsProvider } from "./guarded-provider";

export type { SkillsProvider, ProviderCapabilities } from "./types";

let cached: SkillsProvider | null = null;

/**
 * Resolves the active provider. Server-only: never import this from a client
 * component, so registry credentials can never reach the browser (§17/§49).
 *
 * There is only one source now. When it cannot answer, pages come back empty
 * and say so, rather than being filled with sample skills that do not exist.
 */
export function getSkillsProvider(): SkillsProvider {
  if (!cached) cached = new GuardedSkillsProvider(new SkillsShProvider());
  return cached;
}

/** Client components need the capability flags but must not touch the provider. */
export function getProviderInfo() {
  const p = getSkillsProvider();
  return { id: p.id, label: p.label, capabilities: p.capabilities };
}

/** Why the live registry was last refused, if it was. Diagnostics only. */
export function getProviderFallbackReason(): string | null {
  const p = getSkillsProvider() as { lastError?: string | null };
  return p.lastError ?? null;
}

export type ProviderInfo = ReturnType<typeof getProviderInfo>;
