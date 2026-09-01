/**
 * Supabase is optional. Without it the app still browses and searches — only
 * the account features (favorites, collections, profiles) are unavailable.
 * Every entry point checks this rather than throwing on a missing key.
 */
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, anonKey, isConfigured: Boolean(url && anonKey) };
}

export const AUTH_DISABLED_MESSAGE =
  "Accounts are not configured for this deployment yet.";
