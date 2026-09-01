import { cn } from "@/lib/utils";
import { Mascot, type Expression } from "@/components/brand/mascot";

/**
 * Empty and error states share one shape: mascot, short line, one action.
 * Copy stays terse — the joke lands once, then gets out of the way (§42/§43).
 */
export function EmptyState({
  expression = "idle",
  title,
  body,
  action,
  zzz = false,
  className,
}: {
  expression?: Expression;
  title: string;
  body?: string;
  action?: React.ReactNode;
  zzz?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl card-edge flex flex-col items-center border border-dashed border-line bg-surface/40 px-6 py-14 text-center",
        className
      )}
    >
      <Mascot expression={expression} size={64} float zzz={zzz} />
      <p className="mt-5 font-pixel text-[13px] leading-relaxed text-ink">{title}</p>
      {body && <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-dim">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
