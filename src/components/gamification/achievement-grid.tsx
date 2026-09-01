import { ACHIEVEMENTS } from "@/lib/gamification/rules";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

/**
 * Locked, unlocked, and not-yet-earnable are three different states.
 * An achievement whose trigger does not exist yet says so, rather than
 * pretending it is merely unearned.
 */
export function AchievementGrid({ unlocked }: { unlocked: Set<string> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {ACHIEVEMENTS.map((a) => {
        const Icon = a.icon;
        const isUnlocked = unlocked.has(a.code);

        return (
          <Panel
            key={a.code}
            className={cn(
              "p-4 text-center transition-opacity",
              isUnlocked ? "border-accent/40" : a.available ? "opacity-60" : "opacity-40"
            )}
          >
            <span
              className={cn(
                "mx-auto grid h-11 w-11 place-items-center rounded-xl border",
                isUnlocked
                  ? "border-accent/45 bg-accent/15 text-accent"
                  : "border-line bg-surface-2 text-faint"
              )}
              style={
                isUnlocked
                  ? { boxShadow: "0 0 20px -6px rgb(var(--ls-accent-rgb)/0.7)" }
                  : undefined
              }
            >
              <Icon size={19} />
            </span>

            <p className="mt-3 font-pixel text-[9px] uppercase leading-relaxed text-ink">
              {a.name}
            </p>
            <p className="mt-1.5 text-[11px] leading-snug text-faint">
              {a.available ? a.hint : a.blockedBy}
            </p>
            <p
              className={cn(
                "mt-2.5 font-mono text-[10px]",
                isUnlocked ? "text-accent" : "text-faint"
              )}
            >
              {isUnlocked ? "UNLOCKED" : a.available ? "LOCKED" : "COMING SOON"}
            </p>
          </Panel>
        );
      })}
    </div>
  );
}
