import type { Metadata } from "next";
import { EmptyState } from "@/components/feedback/empty-state";
import { Panel, PanelLabel } from "@/components/ui/panel";
import { Terminal } from "@/components/marketing/terminal";

export const metadata: Metadata = { title: "Devices" };

export default function DevicesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-pixel text-[17px] text-ink sm:text-[20px]">MY DEVICES</h1>
        <p className="mt-2 text-[14px] text-dim">
          Installs run on your own machine through the Lazy Skill CLI.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <EmptyState
          expression="waiting"
          title="YOUR COMPUTER IS LONELY."
          body="Connect it. Pairing takes about six seconds."
          className="h-full"
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
              { text: "> waiting for scan... 💤", tone: "accent" },
            ]}
          />
          <p className="mt-4 text-[12px] leading-relaxed text-faint">
            Step 2 — scan the QR it prints with this app. The CLI is shipped in
            Phase 5; this page will pair with it then.
          </p>
        </Panel>
      </div>
    </div>
  );
}
