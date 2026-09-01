import { createInstallPlan, type InstallPlan, type UpstreamAgentId } from "./install-plan.js";
import { runInstall, type InstallOutcome, type InstallProgress } from "./runner.js";

/**
 * Every adapter installs the same way — through the one supported pathway —
 * so the mechanism lives here rather than being copied per agent. What differs
 * per agent is its identifier and where it reads skills from, and those stay
 * in the adapter.
 */
export function installVia(
  upstreamId: UpstreamAgentId,
  plan: InstallPlan,
  onProgress: (progress: InstallProgress) => void
): Promise<InstallOutcome> {
  // Re-narrow the plan to this adapter's own agent. An adapter must never
  // install to an agent it does not represent, even if handed a wider plan.
  const scoped = createInstallPlan({
    skillRef: plan.skillRef,
    agents: [upstreamId],
    scope: plan.scope,
  });
  return runInstall(scoped, onProgress);
}
