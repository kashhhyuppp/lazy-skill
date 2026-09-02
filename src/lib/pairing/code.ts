/**
 * Pairing-code parsing. Pure and shared: the scanner, the manual-entry field
 * and the server-side shape check all agree on what a code looks like.
 *
 * Input here is untrusted — it comes from whatever a camera happened to
 * decode — so this only ever recognises or rejects. It never repairs.
 */

/** 16 random bytes base64url-encode to 22 characters. The range spans that
 *  and the older 32-byte form, so codes issued before the change still pair. */
export const CODE_PATTERN = /^[A-Za-z0-9_-]{20,64}$/;

export function isCodeShaped(value: unknown): value is string {
  return typeof value === "string" && CODE_PATTERN.test(value);
}

/**
 * Pulls a pairing code out of a bare code, a pairing URL, or a pasted link.
 * Returns null for anything else — including URLs that look like ours but
 * carry no code, so a mistyped link fails loudly rather than half-working.
 */
export function extractCode(input: string): string | null {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return null;
  if (CODE_PATTERN.test(raw)) return raw;

  // Bail before URL parsing on anything long enough to be an attack surface
  // rather than a scanned link.
  if (raw.length > 2048) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  // Only http(s). A scanned javascript: or data: URL must never be treated as
  // a source of anything.
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const fragment = url.hash.replace(/^#/, "");
  if (CODE_PATTERN.test(fragment)) return fragment;

  const query = url.searchParams.get("c") ?? url.searchParams.get("code");
  if (query && CODE_PATTERN.test(query)) return query;

  return null;
}
