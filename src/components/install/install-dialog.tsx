"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Laptop, X } from "lucide-react";
import type { DeviceRow } from "@/lib/db/devices";
import { AGENTS, type AgentId } from "@/types/skill";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfig } from "@/lib/supabase/config";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mascot } from "@/components/brand/mascot";
import { cn } from "@/lib/utils";

type Phase = "choose" | "queued" | "running" | "done" | "failed";

const STAGE_LABEL: Record<string, string> = {
  starting: "Preparing",
  downloading: "Downloading",
  installing: "Installing",
  verifying: "Verifying",
  done: "Done",
  failed: "Failed",
};

const STAGES = ["downloading", "installing", "verifying"] as const;

interface InstallRow {
  agent_id: string;
  status: string;
  stage: string | null;
  error: string | null;
}

/**
 * The install sheet: pick a computer, pick agents, watch it happen.
 *
 * The browser never runs anything. It names a skill and a device; the CLI on
 * that machine does the work and reports back, and this watches those rows.
 */
export function InstallDialog({
  skill,
  devices,
  onClose,
}: {
  skill: { id: string; name: string };
  devices: DeviceRow[];
  onClose: () => void;
}) {
  const online = devices.filter((d) => d.online);
  const [deviceId, setDeviceId] = React.useState<string>(
    () => (online[0] ?? devices[0])?.id ?? ""
  );
  const device = devices.find((d) => d.id === deviceId) ?? null;

  const available = React.useMemo(
    () => (device?.detectedAgents ?? []).filter((a): a is AgentId => a in AGENTS),
    [device]
  );

  const [touched, setTouched] = React.useState(false);
  const [chosen, setChosen] = React.useState<AgentId[]>([]);
  // Until the user touches the picker, everything the machine has is selected.
  const selected = touched ? chosen : available;

  const [phase, setPhase] = React.useState<Phase>("choose");
  const [rows, setRows] = React.useState<InstallRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [stalled, setStalled] = React.useState(false);
  const router = useRouter();

  /**
   * Watch the history rows the CLI writes into.
   *
   * Realtime gives an instant update, but it is not trusted as the only
   * source: a channel that connects and then silently delivers nothing leaves
   * this screen stuck on "waiting" while the install has already finished.
   * A poll runs alongside it and stops once every row is settled, so the UI
   * always converges even if realtime never fires.
   */
  React.useEffect(() => {
    if (!jobId || !supabaseConfig().isConfigured) return;

    const supabase = createClient();
    let done = false;

    const load = async () => {
      const { data } = await supabase
        .from("installations")
        .select("agent_id, status, stage, error")
        .eq("job_id", jobId);
      if (!data) return;
      setRows(data as InstallRow[]);
      if (data.length > 0 && data.every((r) => r.status === "success" || r.status === "failed")) {
        done = true;
      }
    };

    void load();

    const channel = supabase
      .channel(`install-${jobId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "installations", filter: `job_id=eq.${jobId}` },
        () => void load()
      )
      .subscribe();

    // Backstop. Cheap, and it is the difference between a screen that
    // resolves and one that lies.
    const timer = setInterval(() => {
      if (done) {
        clearInterval(timer);
        return;
      }
      void load();
    }, 2000);

    // An install that never reports is a failure, not an eternal wait.
    const giveUp = setTimeout(() => {
      if (!done) setStalled(true);
    }, 120_000);

    return () => {
      clearInterval(timer);
      clearTimeout(giveUp);
      void supabase.removeChannel(channel);
    };
  }, [jobId]);

  // Derived from the rows rather than tracked separately, so the UI can never
  // disagree with what the database says happened.
  const settled = rows.length > 0 && rows.every((r) => r.status === "success" || r.status === "failed");
  const derived: Phase =
    phase === "choose" || phase === "failed"
      ? phase
      : !settled
        ? rows.length > 0
          ? "running"
          : phase
        : rows.some((r) => r.status === "success")
          ? "done"
          : "failed";

  async function start() {
    setError(null);
    setPhase("queued");
    try {
      const res = await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          skillRef: skill.id,
          skillName: skill.name,
          agents: selected,
          scope: "global",
        }),
      });
      const body = (await res.json()) as { jobId?: string; message?: string };
      if (!res.ok) {
        setError(body.message ?? "That didn't work.");
        setPhase("failed");
        return;
      }
      setJobId(body.jobId ?? null);
      setStalled(false);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
      setPhase("failed");
    }
  }

  const pending: InstallRow[] =
    rows.length > 0
      ? rows
      : selected.map((a) => ({ agent_id: a, status: "pending", stage: null, error: null }));

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Install ${skill.name}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card-edge anim-pop max-h-[90dvh] w-full max-w-md overflow-y-auto border border-line bg-surface p-6 pb-8 sm:pb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-pixel text-[11px] uppercase tracking-[0.12em] text-faint">Install</p>
            <p className="mt-2 truncate text-[17px] font-semibold text-ink">{skill.name}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        {derived === "choose" &&
          (devices.length === 0 ? (
            <div className="mt-6 text-center">
              <Mascot expression="waiting" size={56} className="mx-auto" />
              <p className="mt-4 font-pixel text-[11px] text-ink">NO COMPUTER CONNECTED.</p>
              <p className="mt-3 text-[13px] leading-relaxed text-dim">
                Installs run on your own machine, so one has to be connected first.
              </p>
              <ButtonLink href="/pair" pixel className="mt-5 inline-block text-[10px]">
                  CONNECT COMPUTER
                </ButtonLink>
            </div>
          ) : (
            <>
              <div className="mt-6">
                <p className="font-pixel text-[9px] uppercase tracking-[0.12em] text-faint">
                  Computer
                </p>
                <div className="mt-2.5 space-y-2">
                  {devices.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        setDeviceId(d.id);
                        setTouched(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                        d.id === deviceId
                          ? "border-accent/55 bg-accent/10"
                          : "border-line bg-surface-2 hover:border-accent/35"
                      )}
                    >
                      <Laptop size={16} className={d.online ? "text-ok" : "text-faint"} />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{d.name}</span>
                      {d.online ? <Badge tone="ok">online</Badge> : <Badge>offline</Badge>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-pixel text-[9px] uppercase tracking-[0.12em] text-faint">
                    Install for
                  </p>
                  <p className="text-[11px] text-faint">
                    {touched
                      ? `${selected.length} selected`
                      : available.length > 1
                        ? "all — tap one to narrow"
                        : ""}
                  </p>
                </div>
                {available.length === 0 ? (
                  <p className="mt-2.5 text-[13px] text-faint">
                    That computer reports no supported tools.
                  </p>
                ) : (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {available.map((id) => {
                      const Icon = AGENTS[id].icon;
                      const on = selected.includes(id);
                      return (
                        <button
                          key={id}
                          onClick={() => {
                            // Everything is selected by default, so the first
                            // tap means "just this one" — otherwise tapping
                            // the agent you want silently deselects it and
                            // installs to the other two instead.
                            if (!touched) {
                              setTouched(true);
                              setChosen([id]);
                              return;
                            }
                            setChosen(
                              on ? selected.filter((a) => a !== id) : [...selected, id]
                            );
                          }}
                          aria-pressed={on}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] transition-colors",
                            on
                              ? "border-accent/55 bg-accent/12 text-accent-hi"
                              : "border-line bg-surface-2 text-dim"
                          )}
                        >
                          {on ? <Check size={12} /> : <Icon size={12} />}
                          {AGENTS[id].label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {device && !device.online && (
                <p className="mt-4 rounded-lg border border-warn/35 bg-warn/[0.07] px-3 py-2.5 text-[12px] leading-relaxed text-warn">
                  That computer is offline. The install will start when it next runs{" "}
                  <span className="font-mono">lazy-skill listen</span>.
                </p>
              )}

              <Button
                size="lg"
                pixel
                className="mt-6 w-full text-[11px]"
                disabled={selected.length === 0}
                onClick={start}
              >
                INSTALL
              </Button>
            </>
          ))}

        {(derived === "queued" || derived === "running") && (
          <div className="mt-6">
            <div className="flex items-center gap-4">
              <Mascot expression="working" size={52} float />
              <div>
                <p className="font-pixel text-[11px] text-ink">
                  {derived === "queued" ? "SENDING TO YOUR COMPUTER..." : "INSTALLING..."}
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-dim">
                  {stalled
                    ? "Still nothing back. Check that lazy-skill is running on your computer."
                    : "You can close this. It'll keep going."}
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {pending.map((row) => (
                <AgentProgress key={row.agent_id} row={row} />
              ))}
            </div>
          </div>
        )}

        {derived === "done" && (
          <div className="mt-6 text-center">
            <Mascot expression="excited" size={64} float className="mx-auto" />
            <p className="mt-5 font-pixel text-[13px] text-accent">INSTALLED!</p>
            <div className="mt-5 space-y-3 text-left">
              {rows.map((row) => (
                <AgentProgress key={row.agent_id} row={row} />
              ))}
            </div>
            <div className="mt-6 space-y-1.5 border-t border-line-soft pt-5 text-left">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] text-dim">You contributed</span>
                <span className="font-pixel text-[13px] text-faint">0% effort</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] text-dim">Lazy Skill</span>
                <span className="font-pixel text-[13px] text-accent">100% effort</span>
              </div>
            </div>
            <Button className="mt-6 w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        )}

        {derived === "failed" && (
          <div className="mt-6 text-center">
            <Mascot expression="annoyed" size={56} className="mx-auto" />
            <p className="mt-5 font-pixel text-[11px] leading-relaxed text-ink">
              SKILL INSTALLATION FAILED.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-dim">
              {error ?? "Don't worry. We haven't blamed you yet."}
            </p>
            {rows.length > 0 && (
              <div className="mt-5 space-y-3 text-left">
                {rows.map((row) => (
                  <AgentProgress key={row.agent_id} row={row} />
                ))}
              </div>
            )}
            <Button
              className="mt-6 w-full"
              onClick={() => {
                setRows([]);
                setJobId(null);
                setError(null);
                setPhase("choose");
              }}
            >
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentProgress({ row }: { row: InstallRow }) {
  const agent = AGENTS[row.agent_id as AgentId];
  const failed = row.status === "failed";
  const done = row.status === "success";
  const reached = STAGES.indexOf((row.stage ?? "") as (typeof STAGES)[number]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] text-ink">{agent?.label ?? row.agent_id}</span>
        <span
          className={cn(
            "font-mono text-[11px]",
            failed ? "text-fail" : done ? "text-ok" : "text-faint"
          )}
        >
          {failed ? "failed" : done ? "done" : (STAGE_LABEL[row.stage ?? ""] ?? "waiting")}
        </span>
      </div>
      <div className="mt-1.5 flex gap-1">
        {STAGES.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              failed ? "bg-fail/40" : done || reached >= i ? "bg-accent" : "bg-surface-3"
            )}
          />
        ))}
      </div>
      {row.error && <p className="mt-1.5 text-[11px] leading-snug text-fail">{row.error}</p>}
    </div>
  );
}
