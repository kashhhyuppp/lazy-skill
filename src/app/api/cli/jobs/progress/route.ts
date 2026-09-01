import { NextResponse } from "next/server";
import { authenticateDevice, deviceAuthStatus } from "@/lib/pairing/device-auth";
import { isJobStage } from "@/lib/jobs/contract";

export const dynamic = "force-dynamic";

const TERMINAL = new Set(["succeeded", "failed"]);

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

/**
 * Progress reported by the device.
 *
 * The device is authenticated, but its report is still untrusted input: the
 * job must belong to this device, the stage must be one we know, and the error
 * text is truncated so a chatty installer cannot fill the table.
 */
export async function POST(request: Request) {
  const { device, supabase, reason } = await authenticateDevice(request);
  if (!device || !supabase) {
    return NextResponse.json(
      { error: reason ?? "unauthenticated" },
      { status: deviceAuthStatus(reason) }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const input = (body ?? {}) as Record<string, unknown>;
  if (!isUuid(input.jobId)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const status =
    input.status === "running" || input.status === "succeeded" || input.status === "failed"
      ? input.status
      : "running";
  const stage = isJobStage(input.stage) ? input.stage : null;
  const error =
    typeof input.error === "string" ? input.error.slice(0, 500).trim() || null : null;

  // Scoped to this device: a device can only ever report on its own work.
  const { data: job } = await supabase
    .from("device_jobs")
    .update({
      status,
      stage,
      error,
      ...(TERMINAL.has(status) ? { finished_at: new Date().toISOString() } : {}),
    })
    .eq("id", input.jobId)
    .eq("device_id", device.id)
    .select("id")
    .maybeSingle();

  if (!job) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const agents = Array.isArray(input.agents)
    ? input.agents.filter((a): a is string => typeof a === "string").slice(0, 6)
    : null;

  // Mirror onto the history rows the user actually looks at.
  //
  // For a per-agent report the *stage* decides that agent's outcome, not the
  // job status: the CLI keeps the job "running" while it works through the
  // remaining agents, so reading the job status here would leave a finished
  // agent marked running and let the closing summary overwrite it.
  const perAgentTerminal =
    agents && agents.length > 0 && (stage === "done" || stage === "failed");

  const installStatus = perAgentTerminal
    ? stage === "done"
      ? "success"
      : "failed"
    : status === "succeeded"
      ? "success"
      : status === "failed"
        ? "failed"
        : "running";

  const rowIsFinished = perAgentTerminal || TERMINAL.has(status);

  let update = supabase
    .from("installations")
    .update({
      status: installStatus,
      stage,
      error,
      ...(rowIsFinished ? { finished_at: new Date().toISOString() } : {}),
    })
    .eq("job_id", input.jobId);

  if (agents && agents.length > 0) {
    // A per-agent report only touches that agent's row, so one failing target
    // does not mark the others failed.
    update = update.in("agent_id", agents);
  } else {
    // A job-level report is a summary, and must not overwrite an outcome an
    // agent already reported for itself. Without this, the closing
    // "succeeded" wipes a per-agent failure and a partial install is shown
    // as a clean success.
    update = update.in("status", ["pending", "running"]);
  }

  await update;

  await supabase
    .from("devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", device.id);

  return NextResponse.json({ ok: true });
}
