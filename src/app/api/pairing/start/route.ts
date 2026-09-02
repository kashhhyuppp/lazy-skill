import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateCode,
  hashSecret,
  isPairingConfigured,
  PAIRING_TTL_MS,
} from "@/lib/pairing/tokens";
import { clientKey, rateLimit } from "@/lib/pairing/rate-limit";
import {
  parseDetectedAgents,
  parseDeviceName,
  parseOsVersion,
  parsePlatform,
  parseTheme,
} from "@/lib/pairing/schema";

export const dynamic = "force-dynamic";

/**
 * Called by the CLI to open a pairing session.
 *
 * Unauthenticated by necessity — the CLI has no credentials yet. The code it
 * receives grants nothing on its own: it must be claimed by a signed-in user
 * before any device token exists.
 */
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "pair-start"), 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many pairing attempts. Wait a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  if (!isPairingConfigured()) {
    return NextResponse.json(
      { error: "unconfigured", message: "Pairing is not configured on this deployment." },
      { status: 503 }
    );
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "unconfigured", message: "Accounts are not configured on this deployment." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request", message: "Expected JSON." }, { status: 400 });
  }

  const input = (body ?? {}) as Record<string, unknown>;
  const code = generateCode();
  const expiresAt = new Date(Date.now() + PAIRING_TTL_MS);

  const { error } = await supabase.from("pairing_tokens").insert({
    code_hash: hashSecret(code),
    device_name: parseDeviceName(input.deviceName),
    platform: parsePlatform(input.platform),
    os_version: parseOsVersion(input.osVersion),
    detected_agents: parseDetectedAgents(input.detectedAgents),
    theme: parseTheme(input.theme),
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return NextResponse.json(
      { error: "server_error", message: "Could not start pairing." },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  // The code travels in the URL fragment: fragments are not sent to servers
  // and stay out of proxy logs and Referer headers.
  //
  // The short /p path is deliberate — every character in this URL becomes QR
  // modules, and the code is displayed on a terminal where a denser symbol is
  // a wall of pixels. /p renders the same page.
  return NextResponse.json({
    code,
    expiresAt: expiresAt.toISOString(),
    expiresInMs: PAIRING_TTL_MS,
    pairUrl: `${appUrl.replace(/\/$/, "")}/p#${code}`,
  });
}
