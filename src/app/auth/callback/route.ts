import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth and magic-link landing point. Exchanges the one-time code for a
 * session, then sends the user where they were headed.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  // Only ever redirect to a path on this origin — an attacker-supplied
  // absolute URL here would be an open redirect off the back of a login.
  const requested = url.searchParams.get("next") ?? "/home";
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/home";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/login?error=unconfigured", url.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=exchange_failed", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
