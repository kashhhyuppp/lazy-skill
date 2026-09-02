"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Search skills...",
  autoFocus = false,
  size = "md",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  const ref = React.useRef<HTMLInputElement>(null);

  // "/" focuses search from anywhere, the way every dev tool does it.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(value);
        ref.current?.blur();
      }}
      className={cn(
        "rounded-xl card-edge group relative flex items-center border border-line bg-surface/80 transition-colors focus-within:border-accent focus-within:glow-accent",
        size === "lg" ? "h-14" : "h-11",
        className
      )}
    >
      <Search
        size={size === "lg" ? 19 : 16}
        className="ml-4 shrink-0 text-faint transition-colors group-focus-within:text-accent"
      />
      <input
        ref={ref}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search skills"
        enterKeyHint="search"
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent px-3 text-ink outline-none placeholder:text-faint",
          size === "lg" ? "text-[16px]" : "text-[14px]"
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            ref.current?.focus();
          }}
          aria-label="Clear search"
          className="mr-3 grid h-7 w-7 place-items-center text-faint transition-colors hover:text-ink"
        >
          <X size={15} />
        </button>
      ) : (
        <kbd className="mr-4 hidden shrink-0 border border-line bg-surface-2 px-1.5 font-mono text-[10px] text-faint sm:block">
          /
        </kbd>
      )}
    </form>
  );
}
