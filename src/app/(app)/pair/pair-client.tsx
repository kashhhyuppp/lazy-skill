"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Keyboard, QrCode } from "lucide-react";
import { ScannerView } from "@/components/pairing/scanner-view";
import { CommandStep } from "@/components/pairing/command-step";
import { Panel } from "@/components/ui/panel";
import { Button, ButtonLink, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/theme/theme-provider";
import { isThemeId } from "@/lib/themes";
import { extractCode } from "@/lib/pairing/code";

type Phase = "choose" | "scanning" | "manual" | "claiming" | "paired" | "failed";

interface ClaimedDevice {
  id: string;
  name: string;
  platform: string;
  detected_agents?: string[];
  theme?: string;
}

const FAILURES: Record<string, { title: string; body: string }> = {
  invalid_code: { title: "THAT CODE ISN'T VALID.", body: "Check you scanned the QR from lazy-skill connect." },
  already_used: { title: "ALREADY USED.", body: "Each QR pairs one computer, once. Generate a fresh one." },
  expired: { title: "THIS QR TOOK TOO LONG.", body: "It's asleep now. Run the command again for a new one." },
  unauthenticated: { title: "SIGN IN FIRST.", body: "A computer has to be connected to an account." },
  default: { title: "THAT DIDN'T WORK.", body: "Even Lazy Skill gets tired sometimes." },
};

/** Survives the round trip through sign-in, which drops the URL fragment. */
const PENDING_KEY = "lazyskill.pendingPairCode";

function readPending(): string | null {
  try {
    return sessionStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

function stashPending(code: string): void {
  try {
    sessionStorage.setItem(PENDING_KEY, code);
  } catch {
    // Storage blocked; the user can still enter the code manually.
  }
}

function clearPending(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** One numbered step. Kept plain: the content is the instruction. */
function Step({
  n,
  title,
  body,
  children,
}: {
  n: number;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <Panel className="p-5">
      <div className="flex gap-3.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-accent/40 bg-accent/10 font-pixel text-[10px] text-accent">
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-tight text-ink">{title}</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-dim">{body}</p>
          {children}
        </div>
      </div>
    </Panel>
  );
}

export function PairClient({ signedIn }: { signedIn: boolean }) {
  const [phase, setPhase] = React.useState<Phase>("choose");
  const [failure, setFailure] = React.useState<string>("default");
  const [device, setDevice] = React.useState<ClaimedDevice | null>(null);
  const [manual, setManual] = React.useState("");
  const { setTheme } = useTheme();
  const router = useRouter();

  const claim = React.useCallback(
    async (code: string) => {
      if (!signedIn) {
        stashPending(code);
        router.push("/login?next=/pair");
        return;
      }

      setPhase("claiming");
      try {
        const res = await fetch("/api/pairing/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const body = (await res.json()) as { error?: string; device?: ClaimedDevice };

        if (!res.ok) {
          setFailure(body.error && FAILURES[body.error] ? body.error : "default");
          setPhase("failed");
          return;
        }

        clearPending();
        setDevice(body.device ?? null);

        // Adopt the CLI's theme, so phone and terminal match (§7/§53).
        // Cosmetic only — it is never treated as a credential.
        if (isThemeId(body.device?.theme)) setTheme(body.device.theme);

        setPhase("paired");
        /**
         * A full page load, not router.push.
         *
         * While this account had no computer, the proxy answered every route
         * with a redirect here, and the client router cached those answers.
         * router.refresh() only clears the cache for the route you are on, so
         * afterwards every link in the app still resolved to its cached
         * redirect and clicking did nothing at all. Reloading is the only way
         * to discard the whole cache.
         */
        // The lint rule prefers a client-side navigation, which is precisely
        // what cannot work here: it would be served from the cache built while
        // the app was still gated.
        window.setTimeout(
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          () => window.location.assign("/home"),
          3500
        );
      } catch {
        setFailure("default");
        setPhase("failed");
      }
    },
    [router, setTheme, signedIn]
  );

  // A QR scanned with the phone's own camera lands here with the code in the
  // fragment. Strip it from the address bar immediately so it does not sit in
  // history or get shared by accident.
  const startedRef = React.useRef(false);

  React.useEffect(() => {
    if (startedRef.current) return;

    const fromHash = extractCode(window.location.hash.replace(/^#/, ""));
    const pending = readPending();
    const code = fromHash ?? pending;

    if (fromHash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    if (!code) return;

    startedRef.current = true;

    // Deferred out of the effect body so the first paint is not blocked by a
    // state change, and so a cancelled mount never fires a claim. Claiming is
    // single-use: firing it twice would burn the code.
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void claim(code);
    });
    return () => {
      cancelled = true;
    };
  }, [claim]);

  if (phase === "paired") {
    const agents = device?.detected_agents ?? [];
    return (
      <Panel className="px-6 py-10 text-center">
        <p className="font-pixel text-[14px] text-accent">CONNECTED!</p>
        <p className="mt-3 text-[15px] font-medium text-ink">{device?.name ?? "Your computer"}</p>

        {agents.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {agents.map((agent) => (
              <Badge key={agent} tone="ok">
                <Check size={11} />
                {agent}
              </Badge>
            ))}
          </div>
        )}

        <p className="mt-6 text-[13px] text-dim">Taking you in&hellip;</p>
        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          {/*
            Plain anchors on purpose. These have to be full page loads for the
            same reason as the redirect above: a client-side navigation would
            be served from the cache built while the app was still gated.
          */}
          <a
            href="/explore"
            className={buttonVariants({ pixel: true }) + " rounded-lg text-[10px]"}
          >
            FIND SKILLS
          </a>
          <a href="/devices" className={buttonVariants({ variant: "secondary" }) + " rounded-lg"}>
            My devices
          </a>
        </div>
      </Panel>
    );
  }

  if (phase === "claiming") {
    return (
      <Panel className="px-6 py-14 text-center">
        <p className="mt-5 font-pixel text-[12px] text-ink">AUTHENTICATING...</p>
        <p className="mt-3 text-[13px] text-dim">Pretending this is complicated.</p>
      </Panel>
    );
  }

  if (phase === "failed") {
    const copy = FAILURES[failure] ?? FAILURES.default;
    return (
      <Panel className="px-6 py-10 text-center">
        <p className="mt-5 font-pixel text-[12px] leading-relaxed text-ink">{copy.title}</p>
        <p className="mt-3 text-[13px] leading-relaxed text-dim">{copy.body}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          <Button
            onClick={() => {
              setPhase("choose");
              setManual("");
            }}
          >
            Try again
          </Button>
          {failure === "unauthenticated" && (
            <ButtonLink href="/login?next=/pair" variant="secondary">Sign in</ButtonLink>
          )}
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      {phase === "scanning" ? (
        <ScannerView
          active
          onRetry={() => {
            setPhase("choose");
            // Remount the scanner so a re-request actually reaches the browser.
            setTimeout(() => setPhase("scanning"), 0);
          }}
          onResult={(value) => {
            const code = extractCode(value);
            if (!code) {
              setFailure("invalid_code");
              setPhase("failed");
              return;
            }
            void claim(code);
          }}
        />
      ) : phase === "manual" ? (
        <Panel className="p-6">
          <p className="font-pixel text-[11px] text-ink">ENTER THE CODE</p>
          <p className="mt-2.5 text-[13px] leading-relaxed text-dim">
            The terminal prints a link under the QR. Paste the whole thing, or
            just the part after the #.
          </p>
          <form
            className="mt-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const code = extractCode(manual);
              if (!code) {
                setFailure("invalid_code");
                setPhase("failed");
                return;
              }
              void claim(code);
            }}
          >
            <input
              autoFocus
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="https://lazyskill.com/pair#..."
              aria-label="Pairing code"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="h-11 w-full rounded-lg border border-line bg-surface-2 px-3.5 font-mono text-[13px] text-ink outline-none placeholder:text-faint focus:border-accent"
            />
            <div className="flex gap-2.5">
              <Button type="submit" className="flex-1" disabled={!manual.trim()}>
                Connect
              </Button>
              <Button type="button" variant="ghost" onClick={() => setPhase("choose")}>
                Back
              </Button>
            </div>
          </form>
        </Panel>
      ) : (
        <div className="space-y-3">
          <Step
            n={1}
            title="Run this on your computer"
            body="Any terminal. It prints a QR code."
          >
            <CommandStep command="npx lazy-skill" className="mt-3" />
          </Step>

          <Step n={2} title="Scan it with this phone" body="Point the camera at your screen.">
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <Button size="lg" onClick={() => setPhase("scanning")}>
                <QrCode size={16} />
                Scan QR
              </Button>
              <Button size="lg" variant="secondary" onClick={() => setPhase("manual")}>
                <Keyboard size={16} />
                Enter code
              </Button>
            </div>
          </Step>

          {!signedIn && (
            <p className="pt-1 text-center text-[12px] text-faint">
              You&apos;ll be asked to sign in before the computer is linked.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
