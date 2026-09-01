import { NextResponse } from "next/server";
import { authenticateDevice, deviceAuthStatus } from "@/lib/pairing/device-auth";

export const dynamic = "force-dynamic";

/**
 * The CLI's long-poll. Hands out at most one job, to exactly one caller.
 *
 * The claim is atomic in the database (`for update skip locked`), so two CLI
 * instances polling the same device can never both take the same job.
 */
export async function POST(request: Request) {
  const { device, supabase, reason } = await authenticateDevice(request);
  if (!device || !supabase) {
    return NextResponse.json(
      { error: reason ?? "unauthenticated" },
      { status: deviceAuthStatus(reason) }
    );
  }

  // Sweep first, so a device that was offline does not pick up work the user
  // gave up on ten minutes ago.
  await supabase.rpc("expire_stale_jobs");

  const { data, error } = await supabase.rpc("claim_next_job", { p_device_id: device.id });
  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const job = Array.isArray(data) ? data[0] : data;
  if (!job) {
    await supabase
      .from("devices")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", device.id);
    return NextResponse.json({ job: null });
  }

  return NextResponse.json({
    job: {
      id: job.id,
      command: job.command,
      payload: job.payload,
    },
  });
}
