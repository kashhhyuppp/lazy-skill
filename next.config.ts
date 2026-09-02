import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Supabase is the only cross-origin the app talks to: REST and auth over
 * https, realtime over a websocket. Deriving both from the same env var means
 * a project change cannot leave the policy pointing at the old host.
 */
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseOrigins = supabase
  ? [supabase, supabase.replace(/^https:/, "wss:")]
  : [];

/**
 * Content-Security-Policy.
 *
 * `script-src` still needs 'unsafe-inline': Next's bootstrap and flight
 * payloads are inline scripts, and moving to nonces means routing every
 * response through the proxy. That is worth doing, but it is a change to how
 * every page is served rather than a header edit, so it is not folded into a
 * security fix. The directives that do the heavy lifting here are
 * frame-ancestors, object-src and base-uri.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // Tailwind and Next both emit inline style attributes.
  "style-src 'self' 'unsafe-inline'",
  // Avatars come from whichever host the OAuth provider uses.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigins.join(" ")}${isDev ? " ws: http://localhost:*" : ""}`.trim(),
  // The QR scanner paints camera frames into a canvas.
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  // Clickjacking the install dialog would let a third-party page get a skill
  // installed on someone's laptop with one stray click.
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  // The version of Next in use is not something a response needs to advertise.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // Belt and braces with frame-ancestors, for anything that predates it.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The camera is genuinely used — the phone scans the CLI's QR code —
          // so it is allowed for this origin and denied to anything embedded.
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
      {
        // A device token is handed out here exactly once. No cache, anywhere.
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
