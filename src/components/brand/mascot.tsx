import { cn } from "@/lib/utils";
import { PX, spriteRows, SPRITE_SIZE, type Expression } from "./sprite-data";

export type { Expression };

interface MascotProps {
  expression?: Expression;
  /** Rendered edge length in px. Snapped to a multiple of the grid. */
  size?: number;
  float?: boolean;
  /** Animated "Zz" trail. Only meaningful while Bit is asleep. */
  zzz?: boolean;
  className?: string;
  title?: string;
}

/**
 * Bit, drawn from the generated pixel grid as one <rect> per horizontal run.
 * The hood pulls its colour from CSS custom properties, so the mascot
 * retints with the active theme without a second asset.
 */
export function Mascot({
  expression = "idle",
  size = 64,
  float = false,
  zzz = false,
  className,
  title,
}: MascotProps) {
  const rows = spriteRows(expression);
  const step = SPRITE_SIZE / 2;
  const px = Math.max(step, Math.round(size / step) * step);

  const rects: React.ReactElement[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < SPRITE_SIZE) {
      const fill = PX[row[x]];
      if (!fill) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < SPRITE_SIZE && row[x + run] === row[x]) run++;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={run} height={1} fill={fill} />);
      x += run;
    }
  });

  return (
    <span
      className={cn("relative inline-block leading-none", float && "anim-float", className)}
      style={{ width: px, height: px }}
    >
      <svg
        viewBox={`0 0 ${SPRITE_SIZE} ${SPRITE_SIZE}`}
        width={px}
        height={px}
        shapeRendering="crispEdges"
        role={title ? "img" : "presentation"}
        aria-label={title}
        aria-hidden={title ? undefined : true}
        className="pixelated block"
      >
        {rects}
      </svg>

      {zzz && (
        <span aria-hidden className="pointer-events-none absolute -top-1 -right-1 select-none">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="anim-zzz absolute right-0 top-0 font-pixel text-support"
              style={{ fontSize: px * 0.2, animationDelay: `${i * 0.9}s` }}
            >
              z
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
