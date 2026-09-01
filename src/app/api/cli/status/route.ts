import { NextResponse } from "next/server";
import { authenticateDevice, deviceAuthStatus } from "@/lib/pairing/device-auth";
import { parseDetectedAgents } from "@/lib/pairing/schema";

export const dynamic = "force-dynamic";

/**
 * Heartbeat. The CLI reports which agents it currently detects, and gets back
 * the device record as the server sees it.
 *
 * Detected agents are refreshed on every call rather than frozen at pairing,
 * because a user can install Cursor an hour after connecting.
 */
export async function POST(request: Request) {
  const { device, supabase, reason } = await authenticateDevice(request);
  if (!device || !supabase) {
    return NextResponse.json(
      { error: reason ?? "unauthenticated" },
      { status: deviceAuthStatus(reason) }
    );
  }

  let detected = device.detectedAgents;
  try {
    const body = (await request.json()) as { detectedAgents?: unknown };
    if (body?.detectedAgents !== undefined) detected = parseDetectedAgents(body.detectedAgents);
  } catch {
    // A heartbeat with no body is still a heartbeat.
  }

  await supabase
    .from("devices")
    .update({ last_seen_at: new Date().toISOString(), detected_agents: detected })
    .eq("id", device.id);

  return NextResponse.json({
    ok: true,
    device: {
      id: device.id,
      name: device.name,
      platform: device.platform,
      theme: device.theme,
      detectedAgents: detected,
    },
  });
}
