import { TriangleAlert } from "lucide-react";

/** Attribution for live registry data. */
export function SourceNote({ label }: { label: string }) {
  return (
    <p className="font-mono text-[11px] text-faint">
      Data from <span className="text-dim">{label}</span>
    </p>
  );
}

/**
 * Shown when the registry could not be reached.
 *
 * The page underneath is empty, and saying so plainly matters: telling
 * someone their search found nothing, when we never managed to search, is
 * simply untrue. Nothing is invented to fill the space.
 */
export function RegistryDownNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-warn/35 bg-warn/[0.07] px-3 py-2.5 text-[12px] leading-relaxed text-warn/90">
      <TriangleAlert size={14} className="mt-0.5 shrink-0" />
      <p>
        <span className="font-pixel text-[9px] uppercase tracking-[0.12em]">
          Registry unavailable
        </span>{" "}
        — the skill source isn&apos;t responding. Nothing is missing from your
        account; this clears as soon as it recovers.
      </p>
    </div>
  );
}
