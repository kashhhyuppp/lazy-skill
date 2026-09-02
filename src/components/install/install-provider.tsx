"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { DeviceRow } from "@/lib/db/devices";
import { InstallDialog } from "./install-dialog";

interface InstallTarget {
  id: string;
  name: string;
}

interface InstallContextValue {
  /** Opens the install sheet for a skill from anywhere in the app. */
  open: (skill: InstallTarget) => void;
  signedIn: boolean;
}

const InstallContext = React.createContext<InstallContextValue | null>(null);

/**
 * Hosts the install sheet once, at the app shell.
 *
 * Skill cards appear on home, explore, categories, favourites and related
 * lists. Each of them needs the same install flow, and none of them should
 * have to know about devices or sessions — so the dialog lives here and cards
 * just ask for it.
 */
export function InstallProvider({
  devices,
  signedIn,
  children,
}: {
  devices: DeviceRow[];
  signedIn: boolean;
  children: React.ReactNode;
}) {
  const [skill, setSkill] = React.useState<InstallTarget | null>(null);
  const router = useRouter();

  const open = React.useCallback(
    (target: InstallTarget) => {
      if (!signedIn) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      setSkill(target);
    },
    [router, signedIn]
  );

  const value = React.useMemo(() => ({ open, signedIn }), [open, signedIn]);

  return (
    <InstallContext.Provider value={value}>
      {children}
      {skill && (
        <InstallDialog skill={skill} devices={devices} onClose={() => setSkill(null)} />
      )}
    </InstallContext.Provider>
  );
}

/** Returns a no-op outside a provider so a card can render in isolation. */
export function useInstall(): InstallContextValue {
  return React.useContext(InstallContext) ?? { open: () => {}, signedIn: false };
}
