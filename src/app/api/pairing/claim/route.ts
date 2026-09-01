import { NextResponse } from "next/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDeviceToken, hashSecret, isPairingConfigured } from "@/lib/pairing/tokens";
import { clientKey, rateLimit } from "@/lib/pairing/rate-limit";
import { isCodeShaped } from "@/lib/pairing/schema";

export const dynamic = "force-dynamic";

/**
 * Called by the signed-in phone after scanning the QR.
 *
 * This is the step that confers authority: the code alone proves nothing, so
 * the device is bound to whoever is signed in here. A conditional update on
 * claimed_at makes a second claim impossible even if two phones race.
 */
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "pair-claim"), 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many attempts." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  if (!isPairingConfigured()) {
    return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: "unauthenticated", message: "Sign in before connecting a computer." },
      { status: 401 }
    );
  }

  const supabase = createAdminClient();
  const session = await createClient();
  if (!supabase || !session) {
    return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const code = (body as { code?: unknown })?.code;
  if (!isCodeShaped(code)) {
    return NextResponse.json({ error: "invalid_code", message: "That code is malformed." }, { status: 400 });
  }

  const { data: pairing } = await supabase
    .from("pairing_tokens")
    .select("id, device_name, platform, os_version, detected_agents, theme, expires_at, claimed_at")
    .eq("code_hash", hashSecret(code))
    .maybeSingle();

  if (!pairing) {
    return NextResponse.json(
      { error: "invalid_code", message: "That code is not valid." },
      { status: 404 }
    );
  }
  if (pairing.claimed_at) {
    return NextResponse.json(
      { error: "already_used", message: "That code was already used." },
      { status: 409 }
    );
  }
  if (new Date(pairing.expires_at as string).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "expired", message: "That QR took too long. It's asleep now." },
      { status: 410 }
    );
  }

  // Claim first, conditionally. If another request got here microseconds
  // earlier this matches nothing, and no device is created.
  const { data: claimed } = await supabase
    .from("pairing_tokens")
    .update({ claimed_at: new Date().toISOString(), claimed_by: user.id })
    .eq("id", pairing.id)
    .is("claimed_at", null)
    .select("id")
    .maybeSingle();

  if (!claimed) {
    return NextResponse.json(
      { error: "already_used", message: "That code was already used." },
      { status: 409 }
    );
  }

  const deviceToken = generateDeviceToken();

  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .insert({
      user_id: user.id,
      name: pairing.device_name,
      platform: pairing.platform,
      os_version: pairing.os_version,
      detected_agents: pairing.detected_agents,
      theme: pairing.theme,
      token_hash: hashSecret(deviceToken),
    })
    .select("id, name, platform, detected_agents, theme")
    .single();

  if (deviceError || !device) {
    return NextResponse.json(
      { error: "server_error", message: "Could not register the device." },
      { status: 500 }
    );
  }

  // Park the token for the CLI's next poll. It is erased the moment it is read.
  await supabase
    .from("pairing_tokens")
    .update({ pending_token: deviceToken, device_id: device.id })
    .eq("id", pairing.id);

  return NextResponse.json({ ok: true, device });
}
