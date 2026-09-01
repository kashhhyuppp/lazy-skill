import { cn } from "@/lib/utils";

/**
 * The LS monogram. Blocky pixel letterforms with a "Zz" tucked into the
 * top-right — the mark reads at 16px and survives monochrome, so it works as
 * favicon, app icon, and CLI glyph from one definition.
 *
 * Drawn on a 24x24 grid: L in ink, S in accent, Zz in the support hue.
 */
const L_CELLS: [number, number, number, number][] = [
  // x, y, w, h
  [2, 5, 3, 12],
  [2, 14, 8, 3],
];

const S_CELLS: [number, number, number, number][] = [
  [12, 5, 9, 3],
  [12, 5, 3, 6],
  [12, 10, 9, 3],
  [18, 10, 3, 6],
  [12, 14, 9, 3],
];

export function LogoMark({
  size = 28,
  className,
  mono = false,
  zzz = true,
}: {
  size?: number;
  className?: string;
  mono?: boolean;
  zzz?: boolean;
}) {
  const ink = mono ? "currentColor" : "var(--ls-text)";
  const accent = mono ? "currentColor" : "var(--ls-accent)";
  const support = mono ? "currentColor" : "var(--ls-support)";

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={cn("pixelated block overflow-visible", className)}
      role="img"
      aria-label="Lazy Skill"
    >
      {L_CELLS.map(([x, y, w, h], i) => (
        <rect key={`l${i}`} x={x} y={y} width={w} height={h} fill={ink} />
      ))}
      {S_CELLS.map(([x, y, w, h], i) => (
        <rect key={`s${i}`} x={x} y={y} width={w} height={h} fill={accent} />
      ))}
      {zzz && (
        <g fill={support} opacity={mono ? 0.65 : 1}>
          {/* big Z */}
          <rect x={15} y={0} width={5} height={1.5} />
          <rect x={18} y={1.5} width={1.5} height={1} />
          <rect x={16.5} y={2.5} width={1.5} height={1} />
          <rect x={15} y={3.5} width={5} height={1.5} />
          {/* little z */}
          <rect x={20.5} y={2} width={3.5} height={1} />
          <rect x={22.5} y={3} width={1} height={1} />
          <rect x={20.5} y={4} width={3.5} height={1} />
        </g>
      )}
    </svg>
  );
}

/**
 * Full lockup. "LAZY" in ink, "SKILL" in accent — the two-tone split is the
 * wordmark's signature and must survive every theme.
 */
export function Logo({
  className,
  size = 26,
  showWord = true,
  mono = false,
}: {
  className?: string;
  size?: number;
  showWord?: boolean;
  mono?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} mono={mono} />
      {showWord && (
        <span className="whitespace-nowrap font-pixel text-[13px] leading-none tracking-tight">
          <span className="text-ink">LAZY</span>{" "}
          <span className={mono ? "text-ink" : "text-accent"}>SKILL</span>
        </span>
      )}
    </span>
  );
}

/** Hero-scale wordmark with the tri-colour tagline from the brand board. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("select-none", className)}>
      <h1 className="font-pixel text-[38px] leading-[1.05] tracking-tight sm:text-[54px] lg:text-[62px]">
        <span className="text-ink">LAZY</span>{" "}
        <span className="text-accent text-glow">SKILL</span>
        <sup className="ml-1 align-super font-pixel text-[0.38em] text-support text-glow">Zz</sup>
      </h1>
      <p className="mt-3 font-mono text-[13px] tracking-tight sm:text-[16px]">
        <span className="text-support">See it.</span>{" "}
        <span className="text-accent">Search it.</span>{" "}
        <span className="text-ok">Install it.</span>
      </p>
    </div>
  );
}
