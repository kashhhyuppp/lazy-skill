# Build phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Brand, mascot, logo, design system, 7 themes, landing, home, explore, skill cards, skill detail, category, nav | **done** |
| 2 | Live skills registry integration, search, trending | **code complete** — needs a Vercel link to run live |
| 3 | Supabase, auth, favorites, collections, profiles | **code complete** — needs a Supabase project |
| 4 | XP, levels, streaks, achievements, quests, leaderboard | **code complete** — needs the Supabase project |
| 5 | CLI: `npx lazy-skill connect`, themes, QR generation, secure pairing | not started |
| 6 | Web QR scanner, pairing flow, device management, realtime | not started |
| 7 | Claude / Codex / Cursor adapters | not started |
| 8 | Remote installation, progress, history | not started |
| 9 | Polish, PWA, SEO, performance, security review | not started |

## Phase 2 — skills.sh integration

Hosting decision: **Vercel**, so the OIDC token is injected automatically.

### Turning it on

1. Enable **Settings > OIDC Federation** on the Vercel project.
2. `pnpm dlx vercel link`
3. `pnpm dlx vercel env pull` — writes `VERCEL_OIDC_TOKEN` into `.env.local`
   (valid ~12h locally; `@vercel/oidc` refreshes it).
4. `pnpm verify:registry` — checks the live responses against the contract the
   mappers are written against.

With no token present the app falls back to the sample provider, so a fresh
clone still runs and the "sample data" banner makes the state obvious.

### What the registry actually publishes

Verified against the documented contract on 2026-09-01. A listing or search
record carries **only**:

```
id, slug, name, source, installs, sourceType, installUrl, url, isDuplicate?
```

There is no description, no category, no licence, no updated date, and no
per-agent compatibility. This contradicts several assumptions in the original
spec, and the UI was changed rather than the data invented:

| Spec assumed | Reality | What the UI does |
|---|---|---|
| Cards show a description | Listings carry none | Card reads "Open for details"; the detail page recovers the description from the skill's own `SKILL.md` frontmatter |
| Category browse and filter (§26) | No taxonomy published | Category nav and filter are hidden; `/category/*` explains why |
| "Compatible with Claude / Codex" (§19) | Not published, and not really a property of a skill — the same CLI installs to whichever agents you have | Agent filter hidden; detail page explains the install targets |
| Install counts | Published | Shown as reported |
| Security audits | Published, 404 when un-audited | Shown when present, "no audit results" otherwise |

Providers now declare a `capabilities` record, and the UI hides controls the
active source cannot honour instead of showing filters that do nothing. The
sample provider declares all capabilities true, so the full UI is still
exercisable in development.

### Open question for later

Categories are a Lazy Skill taxonomy, not registry data. If we want category
browse back, it needs our own curation layer (a mapping we own and label as
ours) — not inference presented as source metadata.

## Phase 3 — accounts

### Turning it on

1. Create a Supabase project.
2. Run `supabase/migrations/0001_phase3_accounts.sql` in the SQL editor.
3. Put the project URL and anon key in `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Auth > URL Configuration: add `<origin>/auth/callback` as a redirect URL.
5. For GitHub sign-in, add a GitHub OAuth app under Auth > Providers.

With no Supabase keys the app still browses and searches; the account pages
explain that accounts are unconfigured rather than erroring.

### Security posture

- Every table has row level security on, and every policy is scoped to
  `auth.uid()`. The anon key is public by design — RLS is what actually
  separates one account's data from another's.
- The service-role key is not referenced anywhere in the app.
- `collection_skills` rows inherit visibility from their parent collection via
  an `exists` policy rather than carrying their own `user_id`, so sharing a
  collection can never drift out of sync with its contents.
- `/auth/callback` only redirects to same-origin paths — an attacker-supplied
  `next` cannot turn a login into an open redirect.
- Private collections are marked `noindex` even if their URL leaks.
- Server actions validate every input (skill id shape, uuid shape, length
  caps) before touching the database, and re-check the session server-side
  rather than trusting the client.

### Notes

- A `handle_new_user` trigger creates the profile row on signup, so no read
  path ever has to cope with a missing profile.
- Favorites and collection items store a small snapshot (`skill_name`,
  `skill_source`) so those lists render without one registry call per row. The
  skill detail page stays the source of truth for live stats.
- Favorite toggles are optimistic and roll back if the write fails.

### Next 16 note

`src/middleware.ts` was migrated to `src/proxy.ts` (exporting `proxy`) — Next
16 deprecated the middleware convention, and the old filename silently stops
running.

## Phase 4 — gamification

Migration: `supabase/migrations/0002_phase4_gamification.sql` (run after 0001).

### XP cannot be minted from the client

This is the load-bearing decision. There is no "grant me XP" action or route.
`award_xp` is a `security definer` function that attributes every event to
`auth.uid()` rather than to a parameter, and it is only ever called from
inside the server action that performs the underlying deed — favouriting a
skill, creating a collection. `xp_events` is append-only: the table has a
select policy and no insert, update or delete policy, so even a valid session
cannot write to the ledger directly.

Further guards:

- A unique index on `(user_id, kind, subject_id)` means the same subject can
  only ever pay out once. Un-favouriting and re-favouriting a skill earns
  nothing the second time.
- A check constraint caps any single award at 100 XP, so a bug cannot mint a
  fortune.
- Quest rewards use `quest_code:date` as their subject, so a quest can only
  pay out once per day.
- `advance_quest` clamps progress to the target rather than letting it creep.
- A repeated action still counts toward the daily streak but does not advance
  a quest — otherwise re-favouriting one skill would finish "favorite 5".
- Awarding never throws: a points failure must not roll back the favorite the
  user actually asked for.

### The level curve

Each level costs 100 XP more than the last, so reaching level L takes
`50 * L * (L - 1)`: L2 = 100, L5 = 1,000, L10 = 4,500, L25 = 30,000,
L50 = 122,500. Ranks come from the spec and apply from their threshold upward.

`pnpm test` covers this: exact thresholds, that `levelForXp` inverts
`xpForLevel` at every boundary from 1 to 99 and one XP below each, that
negative and `MAX_SAFE_INTEGER` inputs stay in range, rank boundaries, and
that progress never overflows its own level span.

### Rules that cannot be earned yet

Two spec rules depend on things that do not exist, so they are defined with
`available: false` and the UI labels them "COMING SOON" rather than dangling
an unreachable goal:

| Rule | Blocked by |
|---|---|
| "First Skill" and "AI Explorer" achievements, "Install 3 skills" quest | Remote install — Phase 8 |
| "Explorer" achievement, "Explore 2 categories" quest, `category_explored` XP | The live registry publishes no categories (see Phase 2) |

The daily quest rotates deterministically by date across the *earnable* set
only, so today's quest is always one a player can actually finish.

### Leaderboard

Global, weekly and monthly. The windowed boards are computed from the ledger
rather than a second running total, so they cannot drift out of step with
all-time XP.

Real players only — the board is never padded. When it is empty, a separately
headed, badged block shows what a populated board looks like; its rows are
obviously fictional, carry a neutral placeholder instead of an initial, and
are never ranked alongside real players (§35/§62).

## Phase 1 notes for later phases

- Gamification tiles on `/home` and `/profile` render a genuine empty account
  (level 1, 0 XP, 0 streak, all achievements locked). They are not mock values
  and need no "unfaking" — Phase 4 just supplies real numbers.
- Favorite buttons hold local component state only; Phase 3 persists them.
- `/devices` shows the pairing instructions but does not pair. Phase 5/6.
- The install button is inert. Phases 7/8.

## Brand direction (locked 2026-09-01)

Taken from the three branding boards supplied by the user:

- **Mascot** — Bit, a sleepy sloth in a hoodie. Generated by
  `scripts/gen-sloth.mjs` into a 32x32 character grid; run `pnpm sprite` after
  editing the generator. Seven expressions share one body, so only the eye rows
  differ and the character stays recognisably itself.
- **Mark** — an "LS" pixel monogram with a "Zz" in the support hue. Reads at
  16px and survives monochrome, so favicon, app icon and CLI glyph all come
  from one definition.
- **Wordmark** — "LAZY" in ink, "SKILL" in accent, with the tri-colour tagline
  (`See it.` support / `Search it.` accent / `Install it.` green).
- **Surfaces** — rounded cards with a hairline lit edge on near-black, not the
  notched slabs of the first pass.
- **Palette** — every theme carries an accent *and* a support hue, matching the
  two-colour treatment across the boards.
- **Icons** — line icons throughout. Colour emoji mixed into a pixel-art UI
  reads as an accident; the first pass used them and looked it.

`scripts/shoot.mjs` and `scripts/shoot-mobile.mjs` capture routes to `.shots/`
for visual review during development.
