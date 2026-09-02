"use client";

import Link from "next/link";
import { Flame, Search } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { UserMenu, type SessionUser } from "./user-menu";

export function TopBar({ user }: { user: SessionUser | null }) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-xl lg:px-8">
      <Link href="/home" className="lg:hidden">
        <Logo size={24} />
      </Link>

      {/* Icon-only on phones so the account button always has room. */}
      <Link
        href="/explore"
        aria-label="Search skills"
        className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-surface/70 text-faint transition-colors hover:border-accent/50 hover:text-dim sm:hidden"
      >
        <Search size={15} />
      </Link>

      <Link
        href="/explore"
        className="ml-auto hidden h-9 flex-1 items-center gap-2 rounded-lg border border-line bg-surface/70 px-3 text-[13px] text-faint transition-colors hover:border-accent/50 hover:text-dim sm:flex lg:ml-0 lg:max-w-md"
      >
        <Search size={14} />
        <span className="truncate">Search skills...</span>
        <kbd className="ml-auto hidden shrink-0 rounded border border-line bg-surface-2 px-1.5 font-mono text-[10px] text-faint lg:block">
          /
        </kbd>
      </Link>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {/* Streak is local, session-only until Phase 4 persists it. */}
        <span className="rounded-lg hidden items-center gap-1.5 border border-line bg-surface/70 px-2.5 py-1.5 text-[12px] text-dim sm:flex">
          <Flame size={13} className="text-warn" />
          <span className="font-mono">0</span>
        </span>
        <ThemeSwitcher />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
