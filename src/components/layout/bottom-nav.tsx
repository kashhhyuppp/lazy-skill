"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * Mobile tab bar. Sized for thumbs (56px targets) and pinned above the
 * home indicator via safe-area insets.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-bg-deep/95 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {MOBILE_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-14 flex-col items-center justify-center gap-1 transition-colors",
                  active ? "text-accent" : "text-faint active:text-dim"
                )}
              >
                {active && <span className="absolute top-0 h-[2px] w-8 bg-accent" />}
                <Icon size={19} strokeWidth={active ? 2.4 : 1.9} />
                <span className="font-pixel text-[8px] uppercase tracking-wide">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
