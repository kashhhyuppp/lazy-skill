import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/**
 * Decorative stand-in for the pairing QR, with the corner brackets and centre
 * mark from the brand board.
 *
 * The real code is generated in Phase 5. When it lands it drops into the white
 * plate below untouched — quiet zone, contrast and error correction are the
 * QR's own concern, and no ornament is allowed inside the module area.
 */
export function QrFrame({ size = 132, className }: { size?: number; className?: string }) {
  const cell = size / 21;

  // Deterministic placeholder texture — decorative only, never scanned.
  const modules: React.ReactElement[] = [];
  for (let y = 0; y < 21; y++) {
    for (let x = 0; x < 21; x++) {
      const finder =
        (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      const on = finder
        ? x === 0 || x === 6 || y === 0 || y === 6 || (x > 1 && x < 5 && y > 1 && y < 5) ||
          (x > 13 && (x === 14 || x === 20)) === false
        : ((x * 7 + y * 13 + x * y) % 3 === 0);
      if (!finder && !on) continue;
      if (finder) {
        const lx = x % 7, ly = y % 7;
        const ring = lx === 0 || lx === 6 || ly === 0 || ly === 6;
        const core = lx > 1 && lx < 5 && ly > 1 && ly < 5;
        if (!ring && !core) continue;
      }
      modules.push(
        <rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill="#0b0b10" />
      );
    }
  }

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size + 24, height: size + 24 }}>
      {/* corner brackets */}
      {[
        "left-0 top-0 border-l-2 border-t-2 rounded-tl-md",
        "right-0 top-0 border-r-2 border-t-2 rounded-tr-md",
        "left-0 bottom-0 border-l-2 border-b-2 rounded-bl-md",
        "right-0 bottom-0 border-r-2 border-b-2 rounded-br-md",
      ].map((pos) => (
        <span key={pos} className={cn("absolute h-5 w-5 border-accent", pos)} aria-hidden />
      ))}

      <div
        className="absolute inset-3 grid place-items-center rounded-sm bg-white p-1.5"
        aria-hidden
      >
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} shapeRendering="crispEdges">
          {modules}
        </svg>
        <span className="absolute grid h-8 w-8 place-items-center rounded-md bg-white">
          <LogoMark size={26} zzz={false} />
        </span>
      </div>
    </div>
  );
}
