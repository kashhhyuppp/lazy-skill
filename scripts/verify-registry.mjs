/**
 * Hits the live skills.sh API and checks the responses match the contract the
 * mappers are written against. Run after `vercel env pull`.
 *
 *   node --env-file=.env.local scripts/verify-registry.mjs
 */
const BASE = process.env.SKILLS_API_BASE_URL || "https://skills.sh/api/v1";
const token = process.env.VERCEL_OIDC_TOKEN;

if (!token) {
  console.error("VERCEL_OIDC_TOKEN is not set.\nRun: vercel link && vercel env pull");
  process.exit(1);
}

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "  ok  " : "  FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

async function get(path, params = {}) {
  const url = new URL(BASE.replace(/\/$/, "") + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => null);
  return { res, body };
}

console.log(`\nskills.sh contract check — ${BASE}\n`);

// 1. listing
const { res: lr, body: list } = await get("/skills", { view: "trending", per_page: "5" });
check("GET /skills responds 200", lr.status === 200, `status ${lr.status}`);
check("listing has data[]", Array.isArray(list?.data));
check("listing has pagination", Boolean(list?.pagination));
console.log(`       rate limit remaining: ${lr.headers.get("x-ratelimit-remaining") ?? "n/a"}`);

const sample = list?.data?.[0];
if (sample) {
  console.log(`\n  sample record: ${JSON.stringify(sample, null, 2).split("\n").join("\n  ")}\n`);
  for (const field of ["id", "slug", "name", "source", "installs", "sourceType", "url"]) {
    check(`listing record has "${field}"`, field in sample);
  }
  // Fields the UI would like but the contract does not promise.
  for (const field of ["description", "summary", "categories", "tags", "license", "updatedAt"]) {
    const present = field in sample;
    console.log(`  ${present ? "note" : "  --"} listing ${present ? "DOES" : "does not"} carry "${field}"`);
  }
}

// 2. search
const { res: sr, body: search } = await get("/skills/search", { q: "browser", limit: "3" });
check("GET /skills/search responds 200", sr.status === 200, `status ${sr.status}`);
check("search has data[]", Array.isArray(search?.data));
check("search reports searchType", typeof search?.searchType === "string", search?.searchType);

// 3. detail + frontmatter recovery
if (sample?.id) {
  const { res: dr, body: detail } = await get(`/skills/${sample.id}`);
  check(`GET /skills/${sample.id} responds 200`, dr.status === 200, `status ${dr.status}`);
  const files = detail?.files;
  check("detail returns files[] or null", files === null || Array.isArray(files));
  if (Array.isArray(files)) {
    const doc = files.find((f) => /(^|\/)SKILL\.mdx?$/i.test(f.path));
    check("a SKILL.md exists in the snapshot", Boolean(doc), doc?.path ?? "none found");
    if (doc) {
      const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(doc.contents);
      check("SKILL.md has YAML frontmatter", Boolean(fm));
      const desc = fm && /^description:\s*(.+)$/m.exec(fm[1]);
      check("frontmatter carries a description", Boolean(desc),
        desc ? `"${desc[1].slice(0, 70)}..."` : "none — cards will stay bare");
    }
  }

  // 4. audits (404 is a valid "nobody audited this")
  const { res: ar } = await get(`/skills/audit/${sample.id}`);
  check("audit endpoint responds 200 or 404", ar.status === 200 || ar.status === 404, `status ${ar.status}`);
}

console.log(`\n${failures === 0 ? "all checks passed" : `${failures} check(s) failed`}\n`);
process.exit(failures === 0 ? 0 : 1);
