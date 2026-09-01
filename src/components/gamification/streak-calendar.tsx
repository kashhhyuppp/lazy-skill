import { cn } from "@/lib/utils";

/**
 * Four weeks of activity as a pixel grid. Days with a recorded action light
 * up in the accent; everything else stays dark. No invented streaks — an
 * empty account renders an empty grid.
 */
export function StreakCalendar({
  activeDays,
  days = 28,
  className,
}: {
  activeDays: string[];
  days?: number;
  className?: string;
}) {
  const active = new Set(activeDays);
  const today = new Date();

  const cells = Array.from({ length: days }, (_, i) => {
    const date = new Date(today.getTime() - (days - 1 - i) * 86_400_000);
    const iso = date.toISOString().slice(0, 10);
    return { iso, on: active.has(iso), isToday: i === days - 1 };
  });

  return (
    <div
      className={cn("grid grid-flow-col grid-rows-4 gap-1", className)}
      role="img"
      aria-label={`${active.size} active days in the last ${days}`}
    >
      {cells.map((cell) => (
        <span
          key={cell.iso}
          title={cell.iso}
          className={cn(
            "h-3 w-3 rounded-[2px] transition-colors",
            cell.on ? "bg-accent" : "bg-surface-3",
            cell.isToday && "ring-1 ring-accent/60"
          )}
          style={cell.on ? { boxShadow: "0 0 8px -2px var(--ls-accent)" } : undefined}
        />
      ))}
    </div>
  );
}
