"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The command to run, with one tap to copy.
 *
 * This is read on a phone and typed on a laptop, so the useful action is
 * "copy", not "select the text with your thumb". The fallback matters: the
 * clipboard API needs a secure context and permission, and silently doing
 * nothing would leave someone tapping a button that appears broken.
 */
export function CommandStep({ command, className }: { command: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setFailed(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className={className}>
      <button
        onClick={copy}
        aria-label={`Copy ${command}`}
        className={cn(
          "group flex w-full items-center gap-3 rounded-lg border bg-bg-deep px-3.5 py-3 text-left transition-colors",
          copied ? "border-ok/50" : "border-line hover:border-accent/50"
        )}
      >
        <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-accent">
          {command}
        </code>
        <span
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors",
            copied ? "text-ok" : "text-faint group-hover:text-ink"
          )}
        >
          {copied ? <Check size={15} /> : <Copy size={14} />}
        </span>
      </button>

      {failed && (
        <p className="mt-2 text-[11px] text-faint">
          Couldn&apos;t copy automatically — select the text above instead.
        </p>
      )}
    </div>
  );
}
