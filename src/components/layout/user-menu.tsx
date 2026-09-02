"use client";

import * as React from "react";
import Link from "next/link";
import { LogOut, User as UserIcon } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SessionUser {
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export function UserMenu({ user }: { user: SessionUser | null }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <ButtonLink href="/login" size="sm" variant="secondary">
          Sign in
        </ButtonLink>
    );
  }

  const label = user.name ?? user.email ?? "Account";
  const initial = label.charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={cn(
          "grid h-9 w-9 place-items-center overflow-hidden rounded-lg border border-line bg-surface-2 text-[12px] font-semibold text-dim transition-colors hover:border-accent/55 hover:text-accent-hi",
          open && "border-accent/55 text-accent-hi"
        )}
      >
        {user.avatarUrl ? (
          // Avatars come from arbitrary identity providers, so this stays a
          // plain <img> rather than going through the image optimiser.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="card-edge anim-pop absolute right-0 z-50 mt-2 w-56 border border-line bg-surface p-1.5 shadow-2xl shadow-black/60"
        >
          <p className="truncate px-2.5 py-2 text-[12px] text-faint">{user.email ?? label}</p>
          <div className="my-1 h-px bg-line-soft" />
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-dim transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <UserIcon size={14} />
            Profile
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-dim transition-colors hover:bg-surface-2 hover:text-fail"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
