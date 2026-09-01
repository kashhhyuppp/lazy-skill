import type { Skill, SkillAudit } from "@/types/skill";
import type { ApiAudit, ApiSkill, ApiSkillDetail, ApiSkillFile } from "./types";

/**
 * API record -> domain model.
 *
 * The listing contract carries only id, slug, name, source, installs,
 * sourceType, installUrl and url. Everything else the UI can show is genuinely
 * absent, so it maps to null and renders as "unavailable" rather than a
 * plausible-looking default (§18).
 */

/** `owner/repo/skill` -> a github tree URL; well-known sources keep their url. */
function repoUrlFor(api: ApiSkill): string | null {
  if (api.sourceType !== "github") return api.url || null;
  const parts = api.id.split("/");
  if (parts.length < 2) return null;
  return `https://github.com/${parts[0]}/${parts[1]}`;
}

export function mapSkill(api: ApiSkill, trendingRank: number | null = null): Skill {
  return {
    id: api.id,
    slug: api.id,
    name: api.name,
    // The registry does not send a summary with listings. The detail endpoint
    // can recover one from SKILL.md; until then this is honestly empty.
    summary: "",
    description: null,
    source: api.source,
    sourceType: api.sourceType === "github" ? "github" : "registry",
    repoUrl: repoUrlFor(api),
    homepageUrl: api.url || null,
    installs: Number.isFinite(api.installs) ? api.installs : null,
    trendingRank,
    // The registry does not publish per-agent compatibility, and skills are
    // installed by the same CLI regardless of agent — so there is nothing
    // truthful to claim here.
    compatibility: null,
    // No category taxonomy is published either.
    categories: [],
    license: null,
    updatedAt: null,
    audits: null,
    installRef: api.installUrl ?? api.id,
    isDemo: false,
  };
}

/** Minimal YAML frontmatter reader — SKILL.md uses a flat key: value block. */
function readFrontmatter(md: string): Record<string, string> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(md);
  if (!match) return {};

  const out: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const sep = line.indexOf(":");
    if (sep < 1 || /^\s/.test(line)) continue; // skip nested/list entries
    const key = line.slice(0, sep).trim().toLowerCase();
    let value = line.slice(sep + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && value) out[key] = value;
  }
  return out;
}

function findSkillDoc(files: ApiSkillFile[] | null): ApiSkillFile | null {
  if (!files?.length) return null;
  return (
    files.find((f) => /(^|\/)SKILL\.mdx?$/i.test(f.path)) ??
    files.find((f) => /(^|\/)README\.mdx?$/i.test(f.path)) ??
    null
  );
}

function firstParagraph(md: string): string | null {
  const body = md.replace(/^---[\s\S]*?---\r?\n/, "");
  for (const block of body.split(/\r?\n\s*\r?\n/)) {
    const text = block.trim();
    if (!text || text.startsWith("#") || text.startsWith("```")) continue;
    return text.replace(/\s+/g, " ").slice(0, 400);
  }
  return null;
}

/**
 * Enriches a listing record with whatever the skill's own SKILL.md declares.
 * This is the skill describing itself — not us guessing on its behalf.
 */
export function enrichFromDetail(base: Skill, detail: ApiSkillDetail): Skill {
  const doc = findSkillDoc(detail.files);
  if (!doc) return { ...base, installs: detail.installs ?? base.installs };

  const meta = readFrontmatter(doc.contents);
  const summary = meta.description ?? firstParagraph(doc.contents) ?? "";

  return {
    ...base,
    name: meta.name || base.name,
    summary: summary.slice(0, 200),
    description: summary.length > 200 ? summary : null,
    license: meta.license ?? null,
    installs: detail.installs ?? base.installs,
  };
}

const RISK: Record<string, string> = {
  NONE: "none",
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

export function mapAudits(audits: ApiAudit[]): SkillAudit[] {
  return audits.map((a) => ({
    provider: a.provider,
    status: a.status === "pass" || a.status === "warn" || a.status === "fail" ? a.status : "warn",
    riskLevel: a.riskLevel ? (RISK[a.riskLevel] ?? a.riskLevel.toLowerCase()) : null,
  }));
}
