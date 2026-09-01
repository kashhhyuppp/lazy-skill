import { cn } from "@/lib/utils";

export interface TermLine {
  text: string;
  tone?: "dim" | "accent" | "support" | "ok" | "ink";
  /** Renders a trailing check without the text having to carry it. */
  check?: boolean;
}

const TONE: Record<NonNullable<TermLine["tone"]>, string> = {
  dim: "text-faint",
  accent: "text-accent",
  support: "text-support",
  ok: "text-ok",
  ink: "text-ink",
};

/**
 * The CLI, as the marketing site shows it. Same visual language the real
 * terminal renderer targets in Phase 5 — box frame, themed accent, and a
 * caret that never stops blinking.
 */
export function Terminal({
  lines,
  title = "lazy-skill connect",
  heading,
  caret = true,
  className,
  children,
}: {
  lines: TermLine[];
  title?: string;
  /** Centred pixel heading, as the reference CLI cards use. */
  heading?: React.ReactNode;
  caret?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl card-edge overflow-hidden border border-line bg-bg-deep/90 shadow-2xl shadow-black/50 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-line-soft bg-surface/60 px-3.5 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="term-dot bg-[#ff5f57]" />
          <span className="term-dot bg-[#febc2e]" />
          <span className="term-dot bg-[#28c840]" />
        </span>
        <span className="ml-1.5 truncate font-mono text-[11px] text-faint">{title}</span>
      </div>

      <div className="space-y-1 p-4 font-mono text-[12px] leading-[1.7] sm:p-5 sm:text-[13px]">
        {heading && (
          <p className="mb-4 text-center font-pixel text-[13px] tracking-tight text-accent sm:text-[15px]">
            {heading}
          </p>
        )}
        {lines.map((line, i) => (
          <p key={i} className={cn("flex items-center gap-2", TONE[line.tone ?? "dim"])}>
            <span className="whitespace-pre-wrap">{line.text}</span>
            {line.check && <span className="text-ok">✓</span>}
          </p>
        ))}
        {children}
        {caret && (
          <p className="flex items-center gap-2 text-accent">
            <span>{">"}</span>
            <span className="anim-caret inline-block h-[14px] w-[7px] bg-accent" />
          </p>
        )}
      </div>
    </div>
  );
}
