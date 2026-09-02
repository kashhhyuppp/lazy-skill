import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";

/**
 * Cookieless anon client, for data that is the same for everybody.
 *
 * The normal server client reads cookies to establish the session, which makes
 * the surrounding render dynamic and unable to be cached. The leaderboard is
 * public by policy — `profiles` is readable by anyone, which is what makes a
 * leaderboard possible at all — so it does not need to know who is asking, and
 * reading it through this client lets the result be shared across requests.
 *
 * Only use this for data covered by a policy that does not depend on
 * auth.uid(). Anything user-scoped read through here would come back empty.
 */
export function createPublicClient() {
  const { url, anonKey, isConfigured } = supabaseConfig();
  if (!isConfigured) return null;

  return createSupabaseClient(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
