import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/**
 * Reading layout for the privacy and terms pages: one column, generous
 * measure, and a way back. These are the two pages a stranger reads before
 * deciding whether to trust a QR code, so they are plain and quiet rather
 * than styled like the app.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 min-h-dvh">
      <header className="border-b border-line/60">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-5 sm:px-6">
          <Link href="/" aria-label="Lazy Skill home">
            <Logo size={22} />
          </Link>
          <nav className="ml-auto flex gap-4 font-mono text-[11px] text-faint">
            <Link href="/privacy" className="transition-colors hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-ink">
              Terms
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">{children}</main>

      <footer className="border-t border-line/60">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <Link
            href="/"
            className="font-mono text-[11px] text-faint transition-colors hover:text-ink"
          >
            &larr; Back to Lazy Skill
          </Link>
        </div>
      </footer>
    </div>
  );
}
