import { cn } from "@/lib/utils";

/**
 * Empty and error states share one shape: mascot, short line, one action.
 * Copy stays terse — the joke lands once, then gets out of the way (§42/§43).
 */
export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl card-edge flex flex-col items-center border border-dashed border-line bg-surface/40 px-6 py-14 text-center",
        className
      )}
    >
      <p className="font-pixel text-[13px] leading-relaxed text-ink">{title}</p>
      {body && <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-dim">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
