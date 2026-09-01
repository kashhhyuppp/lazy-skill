import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import * as server from "../src/lib/jobs/contract.ts";
import * as device from "../cli/src/lib/job-contract.ts";

/**
 * The server and the CLI each carry their own copy of the command vocabulary,
 * on purpose: a device must not depend on the server for its definition of
 * what is safe to run. Duplication only stays safe if the copies agree, so
 * this test is the thing that keeps them honest.
 */
let checks = 0;
const check = (label: string, fn: () => void) => {
  fn();
  checks++;
  console.log("  ok  " + label);
};

check("the command vocabulary is identical on both sides", () => {
  assert.deepEqual([...device.JOB_COMMANDS], [...server.JOB_COMMANDS]);
});

check("the stage vocabulary is identical on both sides", () => {
  assert.deepEqual([...device.JOB_STAGES], [...server.JOB_STAGES]);
});

check("the agent vocabulary is identical on both sides", () => {
  assert.deepEqual([...device.JOB_AGENTS], [...server.JOB_AGENTS]);
});

check("the skill reference rules are identical on both sides", () => {
  assert.equal(device.SKILL_REF_PATTERN.source, server.SKILL_REF_PATTERN.source);
  assert.equal(device.SKILL_REF_PATTERN.flags, server.SKILL_REF_PATTERN.flags);
  assert.equal(device.MAX_SKILL_REF_LENGTH, server.MAX_SKILL_REF_LENGTH);
});

check("both sides agree on every reference, valid or not", () => {
  const cases = [
    "vercel-labs/agent-skills",
    "owner/repo/skill",
    "owner/repo; rm -rf ~",
    "--global",
    "-g",
    "../../etc/passwd",
    "owner/../../root",
    "https://evil.example/x",
    "git@github.com:owner/repo.git",
    "/etc/passwd",
    "owner",
    "owner/",
    "a/b/c/d",
    "",
    "   ",
    "a".repeat(201) + "/repo",
    "owner/repo`whoami`",
    "owner/repo$(id)",
  ];

  for (const value of cases) {
    assert.equal(
      device.isValidSkillRef(value),
      server.isValidSkillRef(value),
      `disagreement on ${JSON.stringify(value)} — one side would accept what the other refuses`
    );
  }

  for (let i = 0; i < 200; i++) {
    const ref = `${randomBytes(4).toString("hex")}/${randomBytes(6).toString("hex")}`;
    assert.equal(device.isValidSkillRef(ref), server.isValidSkillRef(ref));
  }
});

check("both sides parse an identical payload identically", () => {
  const payload = {
    skillRef: "vercel-labs/agent-skills",
    skillName: "  Agent Skills  ",
    agents: ["claude", "cursor", "claude"],
    scope: "global",
  };
  assert.deepEqual(device.parseInstallPayload(payload), server.parseInstallPayload(payload));
});

check("both sides reject the same malformed payloads", () => {
  const bad: unknown[] = [
    {},
    { skillRef: "owner/repo" },
    { skillRef: "owner/repo", agents: [] },
    { skillRef: "owner/repo", agents: ["nope"] },
    { skillRef: "owner/repo", agents: "claude" },
    { skillRef: "--global", agents: ["claude"] },
    { skillRef: "owner/repo", agents: ["claude-code"] },
    { skillRef: "owner/repo", agents: new Array(7).fill("claude") },
  ];

  for (const payload of bad) {
    let deviceThrew = false;
    let serverThrew = false;
    try {
      device.parseInstallPayload(payload);
    } catch {
      deviceThrew = true;
    }
    try {
      server.parseInstallPayload(payload);
    } catch {
      serverThrew = true;
    }
    assert.equal(
      deviceThrew,
      serverThrew,
      `disagreement on ${JSON.stringify(payload)} — one side accepts what the other refuses`
    );
    assert.equal(deviceThrew, true, `both should reject ${JSON.stringify(payload)}`);
  }
});

check("the upstream agent id is not accepted as a job agent", () => {
  // The CLI's adapters use claude-code; jobs use claude. Mixing them would
  // silently target nothing, because upstream ignores unknown agent values.
  assert.equal(device.isJobAgent("claude-code"), false);
  assert.equal(server.isJobAgent("claude-code"), false);
  assert.equal(device.isJobAgent("claude"), true);
});

check("scope is a two-value enum, never a path", () => {
  const base = { skillRef: "owner/repo", agents: ["claude"] };
  assert.equal(device.parseInstallPayload({ ...base, scope: "project" }).scope, "project");
  assert.equal(device.parseInstallPayload({ ...base, scope: "global" }).scope, "global");
  // Anything else falls back to global rather than being carried through.
  assert.equal(device.parseInstallPayload({ ...base, scope: "/etc" }).scope, "global");
  assert.equal(device.parseInstallPayload({ ...base, scope: "../.." }).scope, "global");
});

console.log(`\n${checks} checks passed\n`);
