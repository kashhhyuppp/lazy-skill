import Link from "next/link";
import { CircleAlert, CircleCheck, Loader } from "lucide-react";
import type { InstallHistoryRow } from "@/lib/db/installations";
import { AGENTS, type AgentId } from "@/types/skill";
import { Panel, PanelLabel } from "@/components/ui/panel";
import { SkillSigil } from "@/components/skills/skill-sigil";
import { relativeDate, cn } from "@/lib/utils";

const STATUS = {
  success: { icon: CircleCheck, tone: "text-ok", label: "installed" },
  failed: { icon: CircleAlert, tone: "text-fail", label: "failed" },
  running: { icon: Loader, tone: "text-accent", label: "installing" },
  pending: { icon: Loader, tone: "text-faint", label: "queued" },
} as const;

export function InstallHistory({ rows }: { rows: InstallHistoryRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="space-y-3">
      <PanelLabel>Recent installs</PanelLabel>
      <ul className="space-y-2.5">
        {rows.map((row) => {
          const status = STATUS[row.status as keyof typeof STATUS] ?? STATUS.pending;
          const Icon = status.icon;
          const agent = AGENTS[row.agentId as AgentId];

          return (
            <li key={row.id}>
              <Panel className="flex items-center gap-3.5 p-3.5">
                <SkillSigil seed={row.skillId} size={38} />
                <Link href={`/skills/${row.skillId}`} className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink">{row.skillName}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-faint">
                    {agent?.label ?? row.agentId}
                    {row.deviceName ? ` · ${row.deviceName}` : ""} · {relativeDate(row.createdAt)}
                  </p>
                </Link>
                <span className={cn("flex shrink-0 items-center gap-1.5 text-[12px]", status.tone)}>
                  <Icon size={14} />
                  {status.label}
                </span>
              </Panel>
              {row.error && row.status === "failed" && (
                <p className="mt-1.5 px-3.5 text-[11px] leading-snug text-fail">{row.error}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
