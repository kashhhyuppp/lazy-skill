import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Calendar, Download, ExternalLink, Scale, ShieldCheck, TrendingUp } from "lucide-react";
import { getSkillsProvider } from "@/lib/providers";
import { CATEGORIES } from "@/types/skill";
import { compactNumber, relativeDate } from "@/lib/utils";
import { Panel, PanelLabel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { SkillSigil } from "@/components/skills/skill-sigil";
import { SkillCard } from "@/components/skills/skill-card";
import { CompatBadges } from "@/components/skills/compat-badges";
import { SkillActions } from "@/components/skills/skill-actions";
import { getUser } from "@/lib/supabase/server";
import { listCollections } from "@/lib/db/collections";
import { listDevices } from "@/lib/db/devices";
import { InstallButton } from "@/components/install/install-button";
import { DemoDataBanner } from "@/components/layout/data-banner";

type Props = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const skill = await getSkillsProvider().get(slug.join("/"));
  if (!skill) return { title: "Skill not found" };

  return {
    title: skill.name,
    description: skill.summary,
    openGraph: {
      title: `${skill.name} · Lazy Skill`,
      description: skill.summary,
      type: "article",
    },
    twitter: { card: "summary_large_image", title: skill.name, description: skill.summary },
  };
}

/** A stat that renders "—" when the source did not report a value (§18). */
function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="text-faint">{icon}</span>
      <span className="flex-1 text-[13px] text-dim">{label}</span>
      <span className="font-mono text-[13px] text-ink">
        {value ?? <span className="text-faint">—</span>}
      </span>
    </div>
  );
}

export default async function SkillDetailPage({ params }: Props) {
  const { slug } = await params;
  const path = slug.join("/");
  const provider = getSkillsProvider();

  const skill = await provider.get(path);
  if (!skill) notFound();

  const [related, user] = await Promise.all([provider.related(path, 3), getUser()]);
  const [collections, devices] = user
    ? await Promise.all([listCollections(), listDevices()])
    : [[], []];

  return (
    <div className="space-y-4">
      <Link
        href="/explore"
        className="inline-block font-mono text-[12px] text-faint transition-colors hover:text-accent"
      >
        ← back to explore
      </Link>

      {skill.isDemo && <DemoDataBanner />}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* ---------- main ---------- */}
        <div className="space-y-4">
          <Panel className="p-6">
            <div className="flex items-start gap-4">
              <SkillSigil seed={skill.slug} size={64} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[22px] font-bold leading-tight text-ink sm:text-[26px]">
                    {skill.name}
                  </h1>
                  {skill.isDemo && <Badge tone="demo">Sample</Badge>}
                </div>
                <p className="mt-1.5 font-mono text-[12px] text-faint">{skill.source}</p>
                <p className="mt-3 text-[14px] leading-relaxed text-dim">{skill.summary}</p>
              </div>
            </div>

            {skill.description && (
              <p className="mt-5 border-t border-line-soft pt-5 text-[14px] leading-relaxed text-dim">
                {skill.description}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {skill.categories.map((c) => {
                const Icon = CATEGORIES[c].icon;
                return (
                  <Link key={c} href={`/category/${c}`}>
                    <Badge className="transition-colors hover:border-accent/45 hover:text-accent-hi">
                      <Icon size={11} />
                      {CATEGORIES[c].label}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          </Panel>

          <Panel className="p-6">
            <PanelLabel className="mb-4">Compatibility</PanelLabel>
            <CompatBadges compatibility={skill.compatibility} />
            <p className="mt-3 text-[12px] leading-relaxed text-faint">
              {skill.compatibility === null
                ? "This source does not publish per-agent compatibility. The skill installs through the same command regardless of agent, so Lazy Skill installs it to whichever agents your connected computer reports."
                : "Only agents the source explicitly lists are shown."}
            </p>
          </Panel>

          <Panel className="p-6">
            <PanelLabel className="mb-4" icon={<ShieldCheck size={11} />}>
              Security
            </PanelLabel>
            {skill.audits === null || skill.audits.length === 0 ? (
              <p className="text-[13px] text-faint">
                No audit results available for this skill. Treat external skills as
                untrusted and review the source before installing.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {skill.audits.map((a) => (
                  <li key={a.provider} className="flex items-center gap-3">
                    <Badge tone={a.status === "pass" ? "ok" : a.status === "warn" ? "warn" : "fail"}>
                      {a.status.toUpperCase()}
                    </Badge>
                    <span className="text-[13px] text-dim">{a.provider}</span>
                    {a.riskLevel && (
                      <span className="ml-auto font-mono text-[12px] text-faint">
                        risk: {a.riskLevel}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {related.length > 0 && (
            <div className="space-y-3 pt-2">
              <PanelLabel>Related skills</PanelLabel>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {related.map((s) => (
                  <SkillCard key={s.id} skill={s} compact />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---------- rail ---------- */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Panel className="p-5">
            <InstallButton
              skill={{ id: skill.id, name: skill.name }}
              devices={devices}
              signedIn={Boolean(user)}
            />
            <div className="mt-2.5">
              <SkillActions
                skill={{ id: skill.id, name: skill.name, source: skill.source }}
                collections={collections}
                signedIn={Boolean(user)}
              />
            </div>
            <p className="mt-4 text-center text-[11px] text-faint">
              Installs run on your connected computer, not in the browser.
            </p>
          </Panel>

          <Panel className="p-5">
            <PanelLabel className="mb-2">Stats</PanelLabel>
            <div className="divide-y divide-line-soft">
              <Stat
                icon={<Download size={14} />}
                label="Installs"
                value={skill.installs !== null ? compactNumber(skill.installs) : null}
              />
              <Stat
                icon={<TrendingUp size={14} />}
                label="Trending"
                value={skill.trendingRank !== null ? `#${skill.trendingRank}` : null}
              />
              <Stat
                icon={<Calendar size={14} />}
                label="Updated"
                value={skill.updatedAt ? relativeDate(skill.updatedAt) : null}
              />
              <Stat icon={<Scale size={14} />} label="License" value={skill.license} />
            </div>
          </Panel>

          <Panel className="p-5">
            <PanelLabel className="mb-3">Source</PanelLabel>
            {skill.repoUrl ? (
              <a
                href={skill.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 font-mono text-[12px] text-accent hover:underline"
              >
                {skill.repoUrl.replace(/^https?:\/\//, "")}
                <ExternalLink size={12} />
              </a>
            ) : (
              <p className="text-[12px] text-faint">No repository link provided.</p>
            )}
            {skill.installRef && (
              <div className="rounded-lg mt-3 border border-line bg-bg-deep px-3 py-2.5">
                <p className="font-mono text-[11px] text-dim">
                  <span className="text-faint">$ </span>
                  npx skills add {skill.installRef}
                </p>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
