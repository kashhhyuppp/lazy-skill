"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { DeviceRow } from "@/lib/db/devices";
import { Button } from "@/components/ui/button";
import { InstallDialog } from "./install-dialog";

/**
 * The product's main verb. Signed-out visitors are sent to sign in rather than
 * shown a dialog they cannot use.
 */
export function InstallButton({
  skill,
  devices,
  signedIn,
}: {
  skill: { id: string; name: string };
  devices: DeviceRow[];
  signedIn: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  return (
    <>
      <Button
        size="lg"
        pixel
        className="w-full text-[11px]"
        onClick={() => {
          if (!signedIn) {
            router.push(`/login?next=${encodeURIComponent(`/skills/${skill.id}`)}`);
            return;
          }
          setOpen(true);
        }}
      >
        INSTALL
      </Button>

      {open && (
        <InstallDialog skill={skill} devices={devices} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
