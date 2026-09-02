import { ArrowRight, Download, Search, Smartphone, Sparkles, Zap } from "lucide-react";
import { Logo, Wordmark } from "@/components/brand/logo";
import { Mascot } from "@/components/brand/mascot";
import { ButtonLink } from "@/components/ui/button";
import { Panel, PanelLabel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Terminal } from "@/components/marketing/terminal";
import { QrFrame } from "@/components/marketing/qr-frame";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

const STEPS = [
  {
    n: "01",
    icon: Smartphone,
    title: "You see it",
    body: "A Reel, a tweet, a Discord message. “This Claude skill is unreal.” And then it’s gone.",
  },
  {
    n: "02",
    icon: Search,
    title: "You search it",
    body: "Open Lazy Skill, type what you half-remember. Fuzzy matching does the rest.",
  },
  {
    n: "03",
    icon: Download,
    title: "You install it",
    body: "Pick your agent. Tap install. Your laptop does the work while you keep scrolling.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative z-10">
      {/* ---------- nav ---------- */}
      <header className="sticky top-0 z-50 border-b border-line/60 bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Logo />
          <nav className="ml-auto flex items-center gap-2">
            <ThemeSwitcher />
            <ButtonLink href="/explore" variant="secondary" size="sm">
                Explore
              </ButtonLink>
            <ButtonLink href="/home" size="sm" pixel className="hidden sm:block text-[10px]">
                OPEN APP
              </ButtonLink>
          </nav>
        </div>
      </header>

      {/* ---------- hero ---------- */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <Badge tone="accent" className="mb-7">
              <Sparkles size={11} />
              Skill discovery, minus the hunting
            </Badge>

            <Wordmark />

            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-dim">
              Found an AI skill while scrolling? Stop hunting for the repo,
              the README, and the one install command buried in step four.
              Search it here and send it straight to your AI workspace.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/explore" size="lg" pixel className="text-[11px]">
                  EXPLORE SKILLS
                  <ArrowRight size={15} />
                </ButtonLink>
              <ButtonLink href="/devices" size="lg" variant="outline">
                  <Zap size={15} />
                  Connect computer
                </ButtonLink>
            </div>

            <p className="mt-7 font-mono text-[12px] text-faint">
              <span className="text-support">$</span> npx lazy-skill connect
            </p>
          </div>

          {/* CLI card — the same shape the real terminal renders */}
          <div className="relative">
            <Terminal
              heading="SCAN TO CONNECT"
              lines={[
                { text: "1. Open Lazy Skill on your phone", tone: "dim" },
                { text: "2. Scan this QR code", tone: "dim" },
              ]}
              caret={false}
            >
              <div className="mt-5 flex items-center justify-center gap-4 sm:gap-6">
                <Mascot
                  expression="idle"
                  size={96}
                  float
                  zzz
                  title="Bit, the Lazy Skill mascot"
                  className="shrink-0"
                />
                <QrFrame />
              </div>
              <div className="mt-5 flex items-center gap-2.5 rounded-lg border border-line bg-surface/60 px-3 py-2.5">
                <span className="term-dot animate-pulse bg-accent" />
                <span className="text-faint">Waiting for scan...</span>
              </div>
            </Terminal>
          </div>
        </div>
      </section>

      {/* ---------- the 30-second demo ---------- */}
      <section className="border-y border-line/60 bg-bg-deep/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <PanelLabel className="mb-3">The whole product</PanelLabel>
          <h2 className="max-w-xl text-[26px] font-bold leading-tight text-ink sm:text-[32px]">
            Three steps. None of them involve reading a README.
          </h2>

          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <Panel key={step.n} interactive className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center border border-accent/35 bg-accent/10 text-accent rounded-lg">
                      <Icon size={17} />
                    </span>
                    <span className="font-pixel text-[22px] text-surface-3">{step.n}</span>
                  </div>
                  <h3 className="mt-5 text-[17px] font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-dim">{step.body}</p>
                </Panel>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- install payoff ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <PanelLabel className="mb-3">The payoff</PanelLabel>
            <h2 className="text-[26px] font-bold leading-tight text-ink sm:text-[32px]">
              Your phone taps install.
              <br />
              Your laptop does the work.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-dim">
              Lazy Skill never touches your filesystem from the browser. The
              install runs through the CLI on your own machine, over an
              authenticated link, using a fixed set of known commands.
            </p>
            <ul className="mt-6 space-y-2.5 font-mono text-[12px] text-dim">
              {[
                "Pairing tokens expire fast and work once",
                "No arbitrary shell commands, ever",
                "You see what runs before it runs",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-[2px] text-ok">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <Panel className="p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <Mascot expression="excited" size={48} />
              <div>
                <p className="font-pixel text-[13px] text-ink">INSTALLED</p>
                <p className="mt-1 text-[13px] text-dim">Browser Automation</p>
              </div>
            </div>

            <div className="mt-6 space-y-2.5 font-mono text-[12px]">
              {["Downloading", "Checking", "Installing", "Verifying"].map((step) => (
                <div key={step} className="flex items-center justify-between text-dim">
                  <span>{step}</span>
                  <span className="text-ok">✓</span>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-line-soft pt-5">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] text-dim">You contributed</span>
                <span className="font-pixel text-[15px] text-faint">0% effort</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-[13px] text-dim">Lazy Skill</span>
                <span className="font-pixel text-[15px] text-accent">100% effort</span>
              </div>
            </div>
          </Panel>
        </div>
      </section>

      {/* ---------- cta ---------- */}
      <section className="border-t border-line/60">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <Mascot expression="happy" size={64} float className="mx-auto" />
          <h2 className="mt-6 font-pixel text-[22px] leading-relaxed text-ink sm:text-[26px]">
            NOW GO BE LAZY
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-dim">
            Your computer was doing nothing anyway.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/home" size="lg" pixel className="text-[11px]">
                OPEN LAZY SKILL
              </ButtonLink>
          </div>
        </div>
      </section>

      <footer className="border-t border-line/60 bg-bg-deep/50">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:px-6">
          <Logo size={22} />
          <p className="font-mono text-[11px] text-faint sm:ml-auto">
            Do less. Install more.
          </p>
        </div>
      </footer>
    </div>
  );
}
