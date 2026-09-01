import type { AgentAdapter, DetectionResult } from "./types.js";
import { anyExists, homePath, onPath } from "./detect.js";

/**
 * Claude Code. Detected by its config directory or its binary on PATH —
 * never assumed present (§13).
 */
export const claudeAdapter: AgentAdapter = {
  id: "claude",
  label: "Claude",

  async detect(): Promise<DetectionResult> {
    const dir = anyExists([homePath(".claude")]);
    if (dir) return { detected: true, evidence: dir };

    if (await onPath("claude")) return { detected: true, evidence: "claude on PATH" };

    return { detected: false };
  },
};
