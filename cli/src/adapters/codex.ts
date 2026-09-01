import type { AgentAdapter, DetectionResult } from "./types.js";
import { anyExists, homePath, onPath } from "./detect.js";

export const codexAdapter: AgentAdapter = {
  id: "codex",
  label: "Codex",

  async detect(): Promise<DetectionResult> {
    const dir = anyExists([homePath(".codex")]);
    if (dir) return { detected: true, evidence: dir };

    if (await onPath("codex")) return { detected: true, evidence: "codex on PATH" };

    return { detected: false };
  },
};
