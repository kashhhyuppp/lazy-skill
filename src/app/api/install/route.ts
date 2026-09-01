import { NextResponse } from "next/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseInstallPayload } from "@/lib/jobs/contract";
import { clientKey, rateLimit } from "@/lib/pairing/rate-limit";

export const dynamic = "force-dynamic";

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

/**
 * Queues an install on one of the caller's own devices.
 *
 * The browser never touches a filesystem and never names a command — it names
 * a skill and a device, both of which are validated here. Device ownership is
 * confirmed through the caller's own session (so row level security applies)
 * before the service-role client is used to write the queue.
 */
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "install"), 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many installs at once." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: "unauthenticated", message: "Sign in to install." },
      { status: 401 }
    );
  }

  const session = await createClient();
  const admin = createAdminClient();
  if (!session || !admin) {
    return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const input = (body ?? {}) as Record<string, unknown>;
  if (!isUuid(input.deviceId)) {
    return NextResponse.json({ error: "bad_request", message: "Unknown device." }, { status: 400 });
  }

  let payload;
  try {
    payload = parseInstallPayload(input);
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_payload", message: (err as Error).message },
      { status: 400 }
    );
  }

  // Read the device through the caller's session, so RLS decides ownership
  // rather than a where-clause we could get wrong.
  const { data: device } = await session
    .from("devices")
    .select("id, detected_agents")
    .eq("id", input.deviceId)
    .is("revoked_at", null)
    .maybeSingle();

  if (!device) {
    return NextResponse.json(
      { error: "no_device", message: "That computer is not connected." },
      { status: 404 }
    );
  }

  // Never queue an install for an agent the device has not reported. The CLI
  // would refuse it anyway; failing here gives a better message (§13).
  const detected = Array.isArray(device.detected_agents)
    ? (device.detected_agents as string[])
    : [];
  const targets = payload.agents.filter((agent) => detected.includes(agent));

  if (targets.length === 0) {
    return NextResponse.json(
      {
        error: "agent_unavailable",
        message: "That computer has none of the selected tools installed.",
      },
      { status: 409 }
    );
  }

  const { data: job, error: jobError } = await admin
    .from("device_jobs")
    .insert({
      user_id: user.id,
      device_id: device.id,
      command: "INSTALL_SKILL",
      payload: { ...payload, agents: targets },
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // One history row per agent, so a partial failure is visible per target.
  const { error: rowsError } = await admin.from("installations").insert(
    targets.map((agent) => ({
      user_id: user.id,
      device_id: device.id,
      job_id: job.id,
      skill_id: payload.skillRef,
      skill_name: payload.skillName,
      agent_id: agent,
      status: "pending",
    }))
  );

  if (rowsError) {
    await admin.from("device_jobs").delete().eq("id", job.id);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, jobId: job.id, agents: targets });
}
