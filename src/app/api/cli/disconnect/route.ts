import { NextResponse } from "next/server";
import { authenticateDevice, deviceAuthStatus } from "@/lib/pairing/device-auth";

export const dynamic = "force-dynamic";

/**
 * Revokes this device. Marking rather than deleting keeps the installation
 * history intact, and the partial index on token_hash means a revoked token
 * stops authenticating immediately.
 */
export async function POST(request: Request) {
  const { device, supabase, reason } = await authenticateDevice(request);
  if (!device || !supabase) {
    return NextResponse.json(
      { error: reason ?? "unauthenticated" },
      { status: deviceAuthStatus(reason) }
    );
  }

  await supabase
    .from("devices")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", device.id);

  return NextResponse.json({ ok: true });
}
