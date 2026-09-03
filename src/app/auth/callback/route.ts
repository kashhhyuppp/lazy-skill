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

  /**
   * When the provider refuses, Supabase sends the reason here rather than a
   * code. Reporting only "the link was incomplete" in that case throws away
   * the one piece of information that explains the failure — which is exactly
   * what happened while setting Google up, and left nothing to debug from.
   */
  const providerError =
    url.searchParams.get("error_description") ??
    url.searchParams.get("error_code") ??
    url.searchParams.get("error");

  const bounce = (params: Record<string, string>) => {
    const target = new URL("/login", url.origin);
    for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
    return NextResponse.redirect(target);
  };

  if (providerError) {
    // Capped, and rendered as text by React, so a hostile provider cannot use
    // it to inject anything into the page.
    return bounce({ error: "provider", message: providerError.slice(0, 300) });
  }

  if (!code) return bounce({ error: "missing_code" });

  const supabase = await createClient();
  if (!supabase) return bounce({ error: "unconfigured" });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return bounce({ error: "exchange_failed", message: error.message.slice(0, 300) });

  return NextResponse.redirect(new URL(next, url.origin));
}
