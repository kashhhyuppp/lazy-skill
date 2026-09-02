"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Laptop, Pencil, Plug, Trash2, X } from "lucide-react";
import type { DeviceRow } from "@/lib/db/devices";
import { renameDevice, revokeDevice } from "@/app/actions/devices";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfig } from "@/lib/supabase/config";
import { AGENTS, type AgentId } from "@/types/skill";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { relativeDate, cn } from "@/lib/utils";

const PLATFORM_LABEL: Record<string, string> = {
  darwin: "macOS",
  win32: "Windows",
  linux: "Linux",
  unknown: "Unknown OS",
};

export function DeviceList({ devices }: { devices: DeviceRow[] }) {
  const router = useRouter();

  /**
   * Live updates from the CLI's heartbeat.
   *
   * Realtime is the fast path, not the only path: a channel can connect and
   * then deliver nothing, which would leave a device showing "offline"
   * indefinitely after it came back. A slow refresh runs alongside it.
   */
  React.useEffect(() => {
    if (!supabaseConfig().isConfigured) return;

    const supabase = createClient();
    const channel = supabase
      .channel("devices-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "devices" },
        () => router.refresh()
      )
      .subscribe();

    // Online state is derived from a timestamp, so it goes stale on its own
    // even when nothing changes server-side.
    const timer = setInterval(() => router.refresh(), 20_000);

    return () => {
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {devices.map((device) => (
        <li key={device.id}>
          <DeviceCard device={device} />
        </li>
      ))}
    </ul>
  );
}

function DeviceCard({ device }: { device: DeviceRow }) {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(device.name);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await renameDevice({ id: device.id, name });
      if (!result.ok) {
        setError(result.error ?? "Could not rename.");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function disconnect() {
    if (!window.confirm(`Disconnect "${device.name}"? It will need to pair again.`)) return;
    startTransition(async () => {
      const result = await revokeDevice(device.id);
      if (!result.ok) setError(result.error ?? "Could not disconnect.");
      router.refresh();
    });
  }

  const known = device.detectedAgents.filter((id): id is AgentId => id in AGENTS);

  return (
    <Panel className="p-5">
      <div className="flex items-start gap-3.5">
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-xl border",
            device.online
              ? "border-ok/40 bg-ok/10 text-ok"
              : "border-line bg-surface-2 text-faint"
          )}
        >
          <Laptop size={19} />
        </span>

        <div className="min-w-0 flex-1">
          {editing ? (
            <form onSubmit={save} className="flex gap-2">
              <input
                autoFocus
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                aria-label="Device name"
                className="h-8 min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-2 text-[13px] text-ink outline-none focus:border-accent"
              />
              <button type="submit" disabled={pending} aria-label="Save name"
                className="grid h-8 w-8 place-items-center rounded-md text-ok hover:bg-ok/10 disabled:opacity-50">
                <Check size={14} />
              </button>
              <button type="button" aria-label="Cancel rename"
                onClick={() => { setEditing(false); setName(device.name); }}
                className="grid h-8 w-8 place-items-center rounded-md text-faint hover:bg-surface-2">
                <X size={14} />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <p className="truncate text-[15px] font-semibold text-ink">{device.name}</p>
              <button
                onClick={() => setEditing(true)}
                aria-label={`Rename ${device.name}`}
                className="-m-1 grid h-8 w-8 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <Pencil size={12} />
              </button>
            </div>
          )}

          <p className="mt-1 font-mono text-[11px] text-faint">
            {PLATFORM_LABEL[device.platform] ?? device.platform}
            {device.osVersion ? ` ${device.osVersion}` : ""}
          </p>

          <p className="mt-2 flex items-center gap-1.5 text-[12px]">
            <span className={cn("h-2 w-2 rounded-full", device.online ? "bg-ok" : "bg-faint")} />
            <span className={device.online ? "text-ok" : "text-faint"}>
              {device.online ? "Connected" : `Last seen ${relativeDate(device.lastSeenAt)}`}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-line-soft pt-4">
        <p className="font-pixel text-[9px] uppercase tracking-[0.12em] text-faint">
          Detected AI tools
        </p>
        {known.length === 0 ? (
          <p className="mt-2.5 text-[12px] text-faint">
            None detected on this computer.
          </p>
        ) : (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {known.map((id) => {
              const Icon = AGENTS[id].icon;
              return (
                <Badge key={id} tone="ok">
                  <Icon size={11} />
                  {AGENTS[id].label}
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-fail/35 bg-fail/10 px-3 py-2 text-[12px] text-fail">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button
          variant="danger"
          size="sm"
          onClick={disconnect}
          disabled={pending}
          className="ml-auto"
        >
          <Trash2 size={13} />
          Disconnect
        </Button>
      </div>
    </Panel>
  );
}

export function ReconnectHint() {
  return (
    <p className="flex items-center gap-2 font-mono text-[12px] text-faint">
      <Plug size={13} />
      Run <span className="text-accent">npx lazy-skill connect</span> again to add another.
    </p>
  );
}
