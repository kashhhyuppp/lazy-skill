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

/**
 * Cached across requests in the same instance. The token is short-lived, so
 * it is re-read well before Vercel would rotate it.
 */
let cachedToken: { value: string; expiresAt: number } | null = null;
const TOKEN_TTL_MS = 5 * 60 * 1000;

async function authToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  // Read the injected value first.
  //
  // Vercel puts a fresh token in the environment on every invocation, and
  // reading it costs nothing. The helper is the fallback for local
  // development, where it refreshes an expired token — but on a cold instance
  // it can take ten seconds or more, which is long enough to look like a hang
  // and to time out a page build.
  const injected = process.env.VERCEL_OIDC_TOKEN;
  const token = injected || (await getVercelOidcToken());

  if (!token) {
    throw new SkillsApiError(401, "no_token", "No Vercel OIDC token available.");
  }

  cachedToken = { value: token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return token;
}

interface RequestOptions {
  /** Seconds. Registry data is not volatile; caching keeps us far under the
   *  600 req/min budget and makes repeat searches instant. */
  revalidate?: number;
  timeoutMs?: number;
}

/**
 * Nothing upstream gets to hang us.
 *
 * Without a bound, a stalled registry call blocks whatever is waiting on it.
 * That took down a production build: prerendering tried to reach the registry,
 * the call never returned, and the page timed out after sixty seconds — three
 * times, then the deploy failed. A request that is slow enough to matter has
 * already failed, so treat it as failed and let the caller fall back.
 */
const DEFAULT_TIMEOUT_MS = 6000;

export async function apiGet<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  { revalidate = 300, timeoutMs = DEFAULT_TIMEOUT_MS }: RequestOptions = {}
): Promise<T> {
  const base = process.env.SKILLS_API_BASE_URL || DEFAULT_BASE;
  const url = new URL(base.replace(/\/$/, "") + path);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }

  // The timeout is a race, not an AbortSignal.
  //
  // Next patches fetch to add its data cache, and that path does not wire an
  // abort signal through — passing `signal` together with `next` makes the
  // request never settle at all. That is worse than having no timeout: it
  // turned every registry call into a guaranteed hang and took the build down
  // with it. Racing leaves caching intact and still bounds the wait.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new SkillsApiError(504, "timeout", `Registry did not answer within ${timeoutMs}ms.`)),
      timeoutMs
    );
  });

  const attempt = (async () => {
    // The token helper reaches out to Vercel, so it is inside the budget.
    const token = await authToken();
    return fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      next: { revalidate },
    });
  })();

  let res: Response;
  try {
    res = await Promise.race([attempt, expired]);
  } finally {
    clearTimeout(timer);
  }

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
