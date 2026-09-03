import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

/** Served by the service worker when a navigation fails entirely. */
export default function OfflinePage() {
  return (
    <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-pixel text-[13px] leading-relaxed text-ink">YOU&apos;RE OFFLINE.</p>
      <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-dim">
        Nothing to install without a connection. We&apos;ll be here.
      </p>
      <p className="mt-6 font-mono text-[12px] text-faint">
        Skills already installed on your computer still work.
      </p>
    </main>
  );
}
