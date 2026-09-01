import { apiBaseUrl, readConfig } from "./config.js";

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  body?: unknown;
  /** Send the stored device token as a Bearer credential. */
  authed?: boolean;
  timeoutMs?: number;
}

/**
 * Talks to the Lazy Skill server. Every call is explicit about whether it
 * carries the device token, so the credential is never sent to an endpoint
 * that does not need it.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, authed = false, timeoutMs = 15_000 } = options;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authed) {
    const token = readConfig().deviceToken;
    if (!token) {
      throw new ApiError(401, "not_connected", "This computer is not connected yet.");
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${apiBaseUrl()}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    });

    const text = await res.text();
    const parsed: unknown = text ? safeJson(text) : null;

    if (!res.ok) {
      const err = parsed as { error?: string; message?: string } | null;
      throw new ApiError(
        res.status,
        err?.error ?? "http_error",
        err?.message ?? `Server returned ${res.status}.`
      );
    }

    return parsed as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new ApiError(0, "timeout", "The server took too long to answer.");
    }
    throw new ApiError(0, "network", `Could not reach ${apiBaseUrl()}.`);
  } finally {
    clearTimeout(timer);
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
