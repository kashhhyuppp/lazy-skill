import assert from "node:assert/strict";
import { stageFor } from "../dist/adapters/runner.js";

/**
 * Stage detection reads another tool's human output, so it is matched against
 * that tool's real markers (captured from skills@1.5.23) rather than loose
 * keywords.
 */
let checks = 0;
const check = (label, fn) => {
  fn();
  checks++;
  console.log("  ok  " + label);
};

check("the startup banner is not a stage", () => {
  // Regression: this line arrives first and contains the word "installing".
  // A bare keyword test reported the install stage before anything had even
  // been downloaded, so progress ran backwards a moment later.
  assert.equal(
    stageFor("claude-code_2-1-252_agent  Agent detected — installing non-interactively"),
    null
  );
});

check("recognises the download markers", () => {
  assert.equal(stageFor("Source: https://github.com/vercel-labs/agent-skills.git"), "downloading");
  assert.equal(stageFor("Fetching skills…"), "downloading");
  assert.equal(stageFor("Cloning repository"), "downloading");
});

check("recognises the install markers", () => {
  assert.equal(stageFor("Installing all 9 skills"), "installing");
  assert.equal(stageFor("Installing 3 skills"), "installing");
  assert.equal(stageFor("copy → Cursor"), "installing");
});

check("recognises the completion markers", () => {
  assert.equal(stageFor("Installation Summary"), "verifying");
  assert.equal(stageFor("Installed 9 skills"), "verifying");
  assert.equal(stageFor("Added vercel-optimize"), "verifying");
});

check("unrecognised output advances nothing", () => {
  const noise = [
    "",
    "npm warn deprecated something@1.0.0",
    "│",
    "◇  Found 9 skills",
    "some unrelated chatter",
  ];
  for (const line of noise) {
    assert.equal(stageFor(line), null, `should not advance on ${JSON.stringify(line)}`);
  }
});

check("the real transcript yields a monotonic sequence", () => {
  // Captured verbatim from a real run, in order.
  const transcript = [
    "claude-code_2-1-252_agent  Agent detected — installing non-interactively",
    "Source: https://github.com/vercel-labs/agent-skills.git",
    "Fetching skills…",
    "Found 9 skills",
    "Installing all 9 skills",
    "Installation Summary",
    "copy → Cursor",
  ];

  const rank = { downloading: 1, installing: 2, verifying: 3 };
  const stages = transcript.map(stageFor).filter(Boolean);

  assert.deepEqual(stages, ["downloading", "downloading", "installing", "verifying", "installing"]);

  // The raw sequence dips at the end, which is exactly why the runner clamps
  // progress to move forward only.
  const ranks = stages.map((s) => rank[s]);
  assert.ok(
    ranks.some((r, i) => i > 0 && r < ranks[i - 1]),
    "transcript should exercise the regression the clamp exists for"
  );
});

console.log(`\n${checks} checks passed\n`);
