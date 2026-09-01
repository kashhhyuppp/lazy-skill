import { cn } from "@/lib/utils";

const GRID = 5;

/** FNV-1a — small, stable, and deterministic across server and client. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * A deterministic pixel sigil per skill — vertically mirrored so it always
 * reads as a deliberate emblem rather than noise. Gives every skill a
 * distinct "item icon" without shipping artwork for each one.
 */
export function SkillSigil({
  seed,
  size = 44,
  className,
}: {
  seed: string;
  size?: number;
  className?: string;
}) {
  const h = hash(seed);
  const cells: boolean[][] = [];
  const half = Math.ceil(GRID / 2);

  for (let y = 0; y < GRID; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < half; x++) {
      row[x] = ((h >> ((y * half + x) % 31)) & 1) === 1;
    }
    // Mirror across the vertical axis.
    for (let x = half; x < GRID; x++) row[x] = row[GRID - 1 - x];
    cells.push(row);
  }

  return (
    <div
      className={cn(
        "rounded-lg grid shrink-0 place-items-center border border-line bg-surface-2",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox={`0 0 ${GRID} ${GRID}`}
        width={size * 0.62}
        height={size * 0.62}
        shapeRendering="crispEdges"
        className="pixelated"
      >
        {cells.map((row, y) =>
          row.map((on, x) =>
            on ? (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={1}
                height={1}
                fill="var(--ls-accent)"
                opacity={(x + y) % 3 === 0 ? 1 : 0.62}
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
}
