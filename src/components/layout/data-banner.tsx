import { TriangleAlert } from "lucide-react";

/**
 * Sample data must never be mistaken for live registry content (§62).
 * This banner is rendered wherever demo records are on screen and is the
 * first thing to disappear once a live provider is configured.
 */
export function DemoDataBanner() {
  return (
    <div className="rounded-lg flex items-start gap-2.5 border border-warn/35 bg-warn/[0.07] px-3 py-2.5 text-[12px] leading-relaxed text-warn/90">
      <TriangleAlert size={14} className="mt-0.5 shrink-0" />
      <p>
        <span className="font-pixel text-[9px] uppercase tracking-[0.12em]">Sample data</span>{" "}
        — these skills are local fixtures for design work, not real registry
        listings. Install counts and audit results are illustrative.
      </p>
    </div>
  );
}

/** Attribution for live registry data — the counterpart to the demo banner. */
export function SourceNote({ label }: { label: string }) {
  return (
    <p className="font-mono text-[11px] text-faint">
      Data from <span className="text-dim">{label}</span>
    </p>
  );
}

/**
 * Shown when the live registry failed and samples are standing in.
 *
 * Distinct from the demo banner on purpose: "this deployment has no registry"
 * and "the registry is down right now" call for different reactions, and
 * telling someone their search found nothing when we never managed to search
 * is simply untrue.
 */
export function RegistryDownNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-warn/35 bg-warn/[0.07] px-3 py-2.5 text-[12px] leading-relaxed text-warn/90">
      <TriangleAlert size={14} className="mt-0.5 shrink-0" />
      <p>
        <span className="font-pixel text-[9px] uppercase tracking-[0.12em]">
          Registry unavailable
        </span>{" "}
        — the skill source isn&apos;t responding, so these are sample entries.
        Search results are incomplete until it recovers.
      </p>
    </div>
  );
}
