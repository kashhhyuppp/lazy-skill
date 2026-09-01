/**
 * Wire types for skills.sh /api/v1. These mirror the published contract
 * exactly — do not add convenience fields here. Anything the API does not
 * send stays absent, and the mapper turns it into an explicit null.
 *
 * Reference: https://skills.sh/docs/api (verified 2026-09-01)
 */

export interface ApiSkill {
  id: string;
  slug: string;
  name: string;
  source: string;
  installs: number;
  sourceType: string;
  installUrl: string | null;
  url: string;
  isDuplicate?: boolean;
  /** "hot" view only. */
  installsYesterday?: number;
  change?: number;
}

export interface ApiPagination {
  page: number;
  perPage: number;
  total: number;
  hasMore: boolean;
}

export interface ApiListResponse {
  data: ApiSkill[];
  pagination: ApiPagination;
}

export interface ApiSearchResponse {
  data: ApiSkill[];
  query: string;
  searchType: "fuzzy" | "semantic" | string;
  count: number;
  durationMs: number;
}

export interface ApiSkillFile {
  path: string;
  contents: string;
}

export interface ApiSkillDetail {
  id: string;
  source: string;
  slug: string;
  installs: number;
  hash: string | null;
  files: ApiSkillFile[] | null;
}

export interface ApiAudit {
  provider: string;
  slug: string;
  status: "pass" | "warn" | "fail" | string;
  summary: string;
  auditedAt: string;
  riskLevel?: string;
  categories?: string[];
}

export interface ApiAuditResponse {
  id: string;
  source: string;
  slug: string;
  audits: ApiAudit[];
}

export interface ApiError {
  error: string;
  message: string;
}

export type ListView = "all-time" | "trending" | "hot";
