import { AGENTS, type AgentId } from "@/types/skill";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Renders agent compatibility. A null list means the source could not tell
 * us — we say so rather than guessing (§19).
 */
export function CompatBadges({
  compatibility,
  className,
  max,
  /** Cards pass "none": repeating an unavailability notice on every tile is
   *  noise. The detail page passes "note" and explains it once. */
  whenUnknown = "note",
}: {
  compatibility: AgentId[] | null;
  className?: string;
  max?: number;
  whenUnknown?: "note" | "none";
}) {
  if (compatibility === null) {
    if (whenUnknown === "none") return null;
    return (
      <span className={cn("text-[11px] italic text-faint", className)}>
        Compatibility information unavailable
      </span>
    );
  }

  const shown = max ? compatibility.slice(0, max) : compatibility;
  const hidden = compatibility.length - shown.length;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {shown.map((id) => {
        const agent = AGENTS[id];
        const Icon = agent.icon;
        return (
          <Badge key={id} tone="accent">
            <Icon size={11} />
            {agent.label}
          </Badge>
        );
      })}
      {hidden > 0 && <span className="text-[11px] text-faint">+{hidden}</span>}
    </div>
  );
}
