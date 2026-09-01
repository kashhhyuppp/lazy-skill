"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { Logo } from "@/components/brand/logo";
import { Mascot } from "@/components/brand/mascot";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 shrink-0 flex-col border-r border-line bg-bg-deep/80 backdrop-blur-xl lg:flex">
      <div className="flex h-16 items-center border-b border-line-soft px-5">
        <Link href="/home" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-lg group relative flex items-center gap-3 px-3 py-2.5 text-[13px] transition-colors",
                active
                  ? "bg-accent/12 text-accent-hi"
                  : "text-dim hover:bg-surface-2 hover:text-ink"
              )}
            >
              {active && <span className="absolute inset-y-1.5 left-0 w-[3px] bg-accent" />}
              <Icon size={16} className="shrink-0" />
              <span className={cn(active && "font-medium")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Device status — the bridge to the CLI. Wired up in Phase 6. */}
      <div className="border-t border-line-soft p-3">
        <Link
          href="/pair"
          className="rounded-lg block border border-line bg-surface/70 p-3 transition-colors hover:border-accent/50"
        >
          <div className="flex items-center gap-3">
            <Mascot expression="idle" size={32} zzz />
            <div className="min-w-0 flex-1">
              <p className="font-pixel text-[9px] uppercase tracking-[0.12em] text-faint">
                No device
              </p>
              <p className="mt-1 truncate text-[12px] text-dim">Connect your computer</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 border-t border-line-soft pt-2.5 font-mono text-[10px] text-accent">
            <Zap size={11} />
            npx lazy-skill connect
          </div>
        </Link>
      </div>
    </aside>
  );
}
