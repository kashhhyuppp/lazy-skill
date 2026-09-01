"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";

/**
 * Browser client. Uses the anon key only — row level security is what protects
 * the data, so this key being public is expected and safe.
 */
export function createClient() {
  const { url, anonKey, isConfigured } = supabaseConfig();
  if (!isConfigured) {
    throw new Error("Supabase is not configured in this environment.");
  }
  return createBrowserClient(url!, anonKey!);
}
