import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashSecret, isPairingConfigured } from "@/lib/pairing/tokens";
import { clientKey, rateLimit } from "@/lib/pairing/rate-limit";
import { isCodeShaped } from "@/lib/pairing/schema";

export const dynamic = "force-dynamic";

/**
 * The CLI polls here while the QR is on screen.
 *
 * Possession of the code is the only thing being proved, and it is looked up
 * by HMAC rather than compared in the application, so no plaintext code exists
 * server-side to leak. On success the device token is returned exactly once
 * and erased from the row in the same breath.
 */
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "pair-poll"), 120, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Slow down." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  if (!isPairingConfigured()) {
    return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  }

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "unconfigured" }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const code = (body as { code?: unknown })?.code;
  if (!isCodeShaped(code)) {
    return NextResponse.json({ error: "bad_request", message: "Malformed code." }, { status: 400 });
  }

  const { data: row } = await supabase
    .from("pairing_tokens")
    .select("id, expires_at, claimed_at, pending_token, device_id, theme")
    .eq("code_hash", hashSecret(code))
    .maybeSingle();

  // An unknown code and an expired one are reported identically, so polling
  // cannot be used to discover whether a code ever existed.
  if (!row || new Date(row.expires_at as string).getTime() < Date.now()) {
    return NextResponse.json({ status: "expired" });
  }

  if (!row.claimed_at) {
    return NextResponse.json({ status: "waiting" });
  }

  if (!row.pending_token) {
    // Claiming is not a single write: the phone marks the code claimed, then
    // the device row is created, then the token is parked here. A poll landing
    // inside that window sees a claimed code with no token yet — which is not
    // the same as the token having been collected, and reporting "consumed"
    // there made the CLI give up on a pairing that was seconds from working.
    //
    // device_id is what separates the two: it is written together with the
    // token, so its absence means the claim is still in flight.
    if (!row.device_id) {
      return NextResponse.json({ status: "waiting" });
    }
    // Genuinely collected. The CLI that paired has its token; nobody else
    // gets one.
    return NextResponse.json({ status: "consumed" });
  }

  const token = row.pending_token as string;

  // Hand the token over once, then erase it. A replayed poll gets "consumed".
  const { error } = await supabase
    .from("pairing_tokens")
    .update({ pending_token: null })
    .eq("id", row.id)
    .not("pending_token", "is", null);

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const { data: device } = await supabase
    .from("devices")
    .select("id, name, platform, detected_agents")
    .eq("id", row.device_id as string)
    .maybeSingle();

  return NextResponse.json({
    status: "paired",
    deviceToken: token,
    device: device ?? null,
  });
}
