import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { listDevices } from "@/lib/db/devices";
import { EmptyState } from "@/components/feedback/empty-state";
import { Panel, PanelLabel } from "@/components/ui/panel";
import { ButtonLink } from "@/components/ui/button";
import { Terminal } from "@/components/marketing/terminal";
import { DeviceList, ReconnectHint } from "./device-list";

export const metadata: Metadata = { title: "Devices" };

export default async function DevicesPage() {
  const user = await getUser();
  const devices = user ? await listDevices() : [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-pixel text-[17px] text-ink sm:text-[20px]">MY DEVICES</h1>
        <p className="mt-2 text-[14px] text-dim">
          Installs run on your own machine through the Lazy Skill CLI.
        </p>
      </div>

      {!user ? (
        <EmptyState
          title="SIGN IN TO CONNECT A COMPUTER."
          body="A computer has to belong to an account before it can install anything."
          action={
            <ButtonLink href="/login?next=/devices" pixel className="text-[10px]">
                SIGN IN
              </ButtonLink>
          }
        />
      ) : devices.length === 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <EmptyState
            title="YOUR COMPUTER IS LONELY."
            body="Connect it. Pairing takes about six seconds."
            className="h-full"
            action={
              <ButtonLink href="/pair" pixel className="text-[10px]">
                  CONNECT COMPUTER
                </ButtonLink>
            }
          />

          <Panel className="p-5">
            <PanelLabel className="mb-4">Step 1 — run this on your computer</PanelLabel>
            <Terminal
              title="terminal"
              caret={false}
              lines={[
                { text: "$ npx lazy-skill connect", tone: "ink" },
                { text: "" },
                { text: "> initializing laziness.exe" },
                { text: "> generating connection portal..." },
                { text: "> waiting for scan...", tone: "accent" },
              ]}
            />
            <p className="mt-4 text-[12px] leading-relaxed text-faint">
              Step 2 — scan the QR it prints with this app.
            </p>
          </Panel>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ReconnectHint />
            <ButtonLink href="/pair" size="sm">Connect another</ButtonLink>
          </div>
          <DeviceList devices={devices} />
        </>
      )}
    </div>
  );
}
