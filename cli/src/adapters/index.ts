import type { AgentAdapter, AgentId } from "./types.js";
import { claudeAdapter } from "./claude.js";
import { codexAdapter } from "./codex.js";
import { cursorAdapter } from "./cursor.js";

export type { AgentAdapter, AgentId, DetectionResult } from "./types.js";

export const ADAPTERS: AgentAdapter[] = [claudeAdapter, codexAdapter, cursorAdapter];

export interface AgentStatus {
  id: AgentId;
  label: string;
  detected: boolean;
  evidence?: string;
}

/** Runs every detector in parallel. A detector that throws counts as absent. */
export async function detectAgents(): Promise<AgentStatus[]> {
  return Promise.all(
    ADAPTERS.map(async (adapter) => {
      try {
        const result = await adapter.detect();
        return {
          id: adapter.id,
          label: adapter.label,
          detected: result.detected,
          evidence: result.evidence,
        };
      } catch {
        return { id: adapter.id, label: adapter.label, detected: false };
      }
    })
  );
}
