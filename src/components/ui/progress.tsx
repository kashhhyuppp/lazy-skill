import { cn } from "@/lib/utils";

/** Segmented bar — reads as an XP meter rather than a loading spinner. */
export function PixelProgress({
  value,
  max = 100,
  segments = 20,
  className,
  label,
}: {
  value: number;
  max?: number;
  segments?: number;
  className?: string;
  label?: string;
}) {
  const pct = max <= 0 ? 0 : Math.min(1, Math.max(0, value / max));
  const lit = Math.round(pct * segments);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div
        className="flex gap-[3px]"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 flex-1 transition-colors duration-300",
              i < lit ? "bg-accent" : "bg-surface-3"
            )}
            style={i < lit ? { boxShadow: "0 0 8px -2px var(--ls-accent)" } : undefined}
          />
        ))}
      </div>
      {label && (
        <span className="font-mono text-[11px] text-faint">{label}</span>
      )}
    </div>
  );
}
