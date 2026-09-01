import type { AgentAdapter, DetectionResult } from "./types.js";
import { anyExists, homePath, onPath } from "./detect.js";
import { installVia } from "./base.js";

/**
 * Codex. Detected by its config directory or its binary on PATH — never
 * assumed present (§13).
 */
export const codexAdapter: AgentAdapter = {
  id: "codex",
  label: "Codex",
  upstreamId: "codex",

  skillsDir() {
    return homePath(".codex", "skills");
  },

  async detect(): Promise<DetectionResult> {
    const dir = anyExists([
      homePath(".codex"),
    ]);
    if (dir) return { detected: true, evidence: dir };

    if (await onPath("codex")) return { detected: true, evidence: "codex on PATH" };

    return { detected: false };
  },

  install(plan, onProgress) {
    return installVia("codex", plan, onProgress);
  },
};
