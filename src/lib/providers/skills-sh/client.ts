import "server-only";
import { getVercelOidcToken } from "@vercel/oidc";
import type { ApiError } from "./types";

const DEFAULT_BASE = "https://skills.sh/api/v1";

export class SkillsApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "SkillsApiError";
  }

  /** A missing snapshot or un-audited skill is absence of data, not failure. */
  get isNotFound() {
    return this.status === 404;
  }

  get isAuth() {
    return this.status === 401;
  }

  get isRateLimited() {
    return this.status === 429;
  }
}

/**
 * True when the app might be able to reach the live registry.
 *
 * Locally the token arrives in .env.local via `vercel env pull`. In a Vercel
 * deployment it is minted per request rather than sitting in the process
 * environment, so checking only for the variable reports "unconfigured" in
 * exactly the place the registry does work — and the app quietly serves
 * sample data in production.
 *
 * So: treat running on Vercel as configured, and let the provider degrade at
 * call time if the token turns out not to be obtainable.
 */
export function isConfigured(): boolean {
  return Boolean(process.env.VERCEL_OIDC_TOKEN) || process.env.VERCEL === "1";
}

async function authToken(): Promise<string> {
  // The helper refreshes an expired token in local development; in production
  // it reads the value Vercel injects per invocation.
  const token = await getVercelOidcToken();
  if (!token) {
    throw new SkillsApiError(401, "no_token", "No Vercel OIDC token available.");
  }
  return token;
}

interface RequestOptions {
  /** Seconds. Registry data is not volatile; caching keeps us far under the
   *  600 req/min budget and makes repeat searches instant. */
  revalidate?: number;
  signal?: AbortSignal;
}

export async function apiGet<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  { revalidate = 300, signal }: RequestOptions = {}
): Promise<T> {
  const base = process.env.SKILLS_API_BASE_URL || DEFAULT_BASE;
  const url = new URL(base.replace(/\/$/, "") + path);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }

  const token = await authToken();

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    next: { revalidate },
    signal,
  });

  if (!res.ok) {
    let code = "http_error";
    let message = `Registry returned ${res.status}.`;
    try {
      const body = (await res.json()) as ApiError;
      code = body.error ?? code;
      message = body.message ?? message;
    } catch {
      // Non-JSON error body; the status alone is enough to act on.
    }
    throw new SkillsApiError(res.status, code, message);
  }

  return (await res.json()) as T;
}
