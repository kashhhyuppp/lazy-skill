import type { AgentAdapter, DetectionResult } from "./types.js";
import { anyExists, homePath, onPath } from "./detect.js";
import { installVia } from "./base.js";

/**
 * Cursor. Detected by its config directory or its binary on PATH — never
 * assumed present (§13).
 */
export const cursorAdapter: AgentAdapter = {
  id: "cursor",
  label: "Cursor",
  upstreamId: "cursor",

  skillsDir() {
    return homePath(".cursor", "skills");
  },

  async detect(): Promise<DetectionResult> {
    const dir = anyExists([
      homePath(".cursor"),
      "/Applications/Cursor.app",
      homePath("Applications", "Cursor.app"),
      homePath("AppData", "Local", "Programs", "cursor"),
    ]);
    if (dir) return { detected: true, evidence: dir };

    if (await onPath("cursor")) return { detected: true, evidence: "cursor on PATH" };

    return { detected: false };
  },

  install(plan, onProgress) {
    return installVia("cursor", plan, onProgress);
  },
};
