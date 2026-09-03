"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { GithubMark } from "@/components/brand/github-mark";
import { GoogleMark } from "@/components/brand/google-mark";
import { createClient } from "@/lib/supabase/client";
import { EMAIL_SIGN_IN_ENABLED } from "@/lib/auth-options";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Mascot } from "@/components/brand/mascot";

const ERRORS: Record<string, string> = {
  missing_code: "That sign-in link was incomplete. Try again.",
  exchange_failed: "That link expired. Ask for a fresh one.",
  unconfigured: "Accounts are not set up on this deployment yet.",
};

/**
 * Sign-in providers, in the order they are offered.
 *
 * A provider only works once it has been switched on in the Supabase
 * dashboard; adding one here does not enable it. Supabase answers an
 * un-enabled provider with "Unsupported provider", which is accurate and
 * useless to a person, so it is rewritten below.
 */
const PROVIDERS = [
  { id: "github" as const, label: "GitHub", Mark: GithubMark },
  { id: "google" as const, label: "Google", Mark: GoogleMark },
];

export function LoginForm({ configured }: { configured: boolean }) {
  const params = useSearchParams();
  const next = params.get("next") ?? "/home";

  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "working" | "sent">("idle");
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(ERRORS[params.get("error") ?? ""] ?? null);

  const redirectTo = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setError(null);
    try {
      const { error } = await createClient().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo() },
      });
      if (error) throw error;
      setStatus("sent");
    } catch (err) {
      setError((err as Error).message);
      setStatus("idle");
    }
  }

  async function signInWith(provider: (typeof PROVIDERS)[number]) {
    setError(null);
    setPending(provider.id);
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: provider.id,
        options: { redirectTo: redirectTo() },
      });
      if (error) throw error;
      // On success the browser leaves for the provider, so nothing below runs.
    } catch (err) {
      const message = (err as Error).message;
      setError(
        /unsupported provider|not enabled/i.test(message)
          ? `${provider.label} sign-in is not switched on for this site yet. Use another option for now.`
          : message
      );
      setPending(null);
    }
  }

  if (!configured) {
    return (
      <Panel className="p-8 text-center">
        <Mascot expression="annoyed" size={64} className="mx-auto" />
        <p className="mt-5 font-pixel text-[12px] leading-relaxed text-ink">
          ACCOUNTS AREN&apos;T SET UP YET.
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-dim">
          Browsing and search work without one. Favorites and collections need
          Supabase configured for this deployment.
        </p>
      </Panel>
    );
  }

  if (status === "sent") {
    return (
      <Panel className="p-8 text-center">
        <Mascot expression="happy" size={64} className="mx-auto" />
        <p className="mt-5 font-pixel text-[12px] leading-relaxed text-ink">CHECK YOUR EMAIL.</p>
        <p className="mt-3 text-[13px] leading-relaxed text-dim">
          We sent a link to <span className="text-accent">{email}</span>. That
          was the hardest part.
        </p>
        <Button variant="ghost" size="sm" className="mt-5" onClick={() => setStatus("idle")}>
          Use a different email
        </Button>
      </Panel>
    );
  }

  return (
    <Panel className="p-7 sm:p-8">
      <div className="text-center">
        <Mascot expression="curious" size={64} float className="mx-auto" />
        <h1 className="mt-5 font-pixel text-[15px] text-ink">WELCOME BACK</h1>
        <p className="mt-2.5 text-[13px] text-dim">
          Sign in to keep favorites, collections, and your streak.
        </p>
      </div>

      <div className="mt-7 space-y-2.5">
        {PROVIDERS.map((provider) => (
          <Button
            key={provider.id}
            variant="secondary"
            size="lg"
            className="w-full"
            disabled={pending !== null}
            onClick={() => signInWith(provider)}
          >
            <provider.Mark size={16} />
            {pending === provider.id ? "Redirecting..." : `Continue with ${provider.label}`}
          </Button>
        ))}
      </div>

      {EMAIL_SIGN_IN_ENABLED && (
        <>
      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="font-mono text-[11px] text-faint">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={sendMagicLink} className="space-y-3">
        <label className="sr-only" htmlFor="email">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-11 w-full rounded-lg border border-line bg-surface-2 px-3.5 text-[14px] text-ink outline-none transition-colors placeholder:text-faint focus:border-accent"
        />
        <Button type="submit" size="lg" className="w-full" disabled={status === "working"}>
          <Mail size={15} />
          {status === "working" ? "Sending..." : "Email me a link"}
        </Button>
      </form>
        </>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-fail/35 bg-fail/10 px-3 py-2.5 text-[12px] text-fail">
          {error}
        </p>
      )}

      <p className="mt-6 text-center text-[11px] leading-relaxed text-faint">
        No password to forget. We only store what you favorite.
      </p>
    </Panel>
  );
}
