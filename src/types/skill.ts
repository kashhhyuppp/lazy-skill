import type { LucideIcon } from "lucide-react";
import {
  Asterisk,
  Bot,
  Box,
  CircleCheck,
  Cloud,
  Code2,
  Cog,
  Database,
  Megaphone,
  Microscope,
  Palette,
  Plane,
  Shield,
  Sparkles,
  Waves,
  Zap,
} from "lucide-react";

/**
 * Domain model for a skill.
 *
 * Nullability is deliberate and load-bearing (§18/§19): every field that a
 * source may not supply is `null`, never a plausible-looking default. The UI
 * renders "unavailable" for null rather than inventing a value.
 */

export const AGENT_IDS = [
  "claude",
  "codex",
  "cursor",
  "copilot",
  "windsurf",
  "gemini",
] as const;

export type AgentId = (typeof AGENT_IDS)[number];

export interface AgentDef {
  id: AgentId;
  label: string;
  icon: LucideIcon;
}

// Line icons throughout — mixing colour emoji into a pixel-art UI reads as an
// accident rather than a choice.
export const AGENTS: Record<AgentId, AgentDef> = {
  claude: { id: "claude", label: "Claude", icon: Asterisk },
  codex: { id: "codex", label: "Codex", icon: Zap },
  cursor: { id: "cursor", label: "Cursor", icon: Box },
  copilot: { id: "copilot", label: "Copilot", icon: Plane },
  windsurf: { id: "windsurf", label: "Windsurf", icon: Waves },
  gemini: { id: "gemini", label: "Gemini", icon: Sparkles },
};

export const CATEGORY_IDS = [
  "development",
  "ai-agents",
  "automation",
  "research",
  "design",
  "devops",
  "productivity",
  "data",
  "security",
  "marketing",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface CategoryDef {
  id: CategoryId;
  label: string;
  icon: LucideIcon;
  blurb: string;
}

export const CATEGORIES: Record<CategoryId, CategoryDef> = {
  development: { id: "development", label: "Development", icon: Code2, blurb: "Write, review, refactor." },
  "ai-agents": { id: "ai-agents", label: "AI Agents", icon: Bot, blurb: "Agents that run other agents." },
  automation: { id: "automation", label: "Automation", icon: Cog, blurb: "Do it once. Never again." },
  research: { id: "research", label: "Research", icon: Microscope, blurb: "Read the internet for you." },
  design: { id: "design", label: "Design", icon: Palette, blurb: "Make it look intentional." },
  devops: { id: "devops", label: "DevOps", icon: Cloud, blurb: "Ship it, watch it, fix it." },
  productivity: { id: "productivity", label: "Productivity", icon: CircleCheck, blurb: "Fewer tabs. Fewer steps." },
  data: { id: "data", label: "Data", icon: Database, blurb: "Query, shape, visualise." },
  security: { id: "security", label: "Security", icon: Shield, blurb: "Find it before they do." },
  marketing: { id: "marketing", label: "Marketing", icon: Megaphone, blurb: "Words that convert." },
};

export const CATEGORY_LIST: CategoryDef[] = CATEGORY_IDS.map((id) => CATEGORIES[id]);

/** Result of a third-party security audit, as reported by the source. */
export interface SkillAudit {
  provider: string;
  status: "pass" | "warn" | "fail";
  riskLevel: string | null;
}

export interface Skill {
  /** Stable provider-scoped id, e.g. "vercel-labs/agent-skills". */
  id: string;
  /** URL-safe path segment used for /skills/[...slug]. */
  slug: string;
  name: string;
  summary: string;
  /** Longer prose. Null when the source gives only a one-liner. */
  description: string | null;
  /** Owner/publisher handle, e.g. "vercel-labs". */
  source: string;
  sourceType: "github" | "registry" | "unknown";
  repoUrl: string | null;
  homepageUrl: string | null;
  /** Null means the source did not report a count. Never fabricate. */
  installs: number | null;
  /** Null means trend data is unavailable, not "flat". */
  trendingRank: number | null;
  /** Null means compatibility could not be established (§19). */
  compatibility: AgentId[] | null;
  categories: CategoryId[];
  license: string | null;
  updatedAt: string | null;
  audits: SkillAudit[] | null;
  /**
   * The exact command the CLI will run. Comes from the provider — never
   * assembled from user input, never a free-form shell string (§23/§56).
   */
  installRef: string | null;
  /**
   * True when this record is local sample content rather than live registry
   * data. The UI must surface this; demo and real data are never blended
   * silently (§62).
   */
  isDemo: boolean;
}

export type SkillView = "trending" | "popular" | "new";

export interface SkillQuery {
  q?: string;
  view?: SkillView;
  category?: CategoryId;
  agent?: AgentId;
  page?: number;
  perPage?: number;
}

export interface SkillPage {
  skills: Skill[];
  page: number;
  perPage: number;
  hasMore: boolean;
  /** Identifies which provider served this page — shown in the data banner. */
  providerId: string;
  /** True when every record in this page is sample content. */
  isDemo: boolean;
}
