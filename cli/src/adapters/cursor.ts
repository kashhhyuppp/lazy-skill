import type { AgentAdapter, DetectionResult } from "./types.js";
import { anyExists, homePath, onPath } from "./detect.js";

export const cursorAdapter: AgentAdapter = {
  id: "cursor",
  label: "Cursor",

  async detect(): Promise<DetectionResult> {
    const dir = anyExists([
      homePath(".cursor"),
      // Platform-specific install locations, checked rather than guessed.
      "/Applications/Cursor.app",
      homePath("Applications", "Cursor.app"),
      homePath("AppData", "Local", "Programs", "cursor"),
    ]);
    if (dir) return { detected: true, evidence: dir };

    if (await onPath("cursor")) return { detected: true, evidence: "cursor on PATH" };

    return { detected: false };
  },
};
