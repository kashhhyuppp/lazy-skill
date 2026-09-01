# Build phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Brand, mascot, logo, design system, 7 themes, landing, home, explore, skill cards, skill detail, category, nav | **done** |
| 2 | Live skills registry integration, search, trending | **code complete** — needs a Vercel link to run live |
| 3 | Supabase, auth, favorites, collections, profiles | **code complete** — needs a Supabase project |
| 4 | XP, levels, streaks, achievements, quests, leaderboard | **code complete** — needs the Supabase project |
| 5 | CLI, QR, pairing, device auth | **code complete** — needs Supabase + PAIRING_SECRET to run live |
| 6 | Web QR scanner, pairing flow, device management, realtime | **code complete** — needs Supabase + PAIRING_SECRET to run live |
| 7 | Claude / Codex / Cursor adapters | **done and verified against real installs** |
| 8 | Remote install, progress, history | **code complete** — the remote loop is unverified without a live database |
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

## Phase 5 — the CLI and device pairing

Migration: `supabase/migrations/0003_phase5_devices.sql`. Also needs
`PAIRING_SECRET` (32+ chars) and `SUPABASE_SERVICE_ROLE_KEY` on the server.

Build and run the CLI locally:

```bash
pnpm cli:build
LAZY_SKILL_API_URL=http://localhost:3000 node cli/dist/index.js connect
```

### Pairing threat model

The pairing code is displayed on a screen and photographed, so it is treated
as public the moment it renders. It is therefore:

- 32 bytes of CSPRNG entropy, base64url encoded
- valid for two minutes
- single-use, enforced by a conditional `update ... is null` on `claimed_at`,
  so two phones racing cannot both claim it
- **not a credential**. Holding it grants nothing. Claiming it requires a
  signed-in user, and the device is bound to whoever that is.

Stored secrets are HMACs, never plaintext: a database leak yields nothing
replayable because the pepper lives in the environment. The device token is
returned to the CLI exactly once and erased from the row in the same request;
a replayed poll gets `consumed`.

Unknown and expired codes return the same response, so polling cannot be used
to discover whether a code ever existed. The pairing endpoints are rate
limited, and the code travels in the URL **fragment**, which browsers do not
send to servers — keeping it out of proxy logs and `Referer` headers.

`pairing_tokens` has RLS enabled and deliberately no policies at all: it is
unreachable with the anon key, and only the service-role routes touch it.

The CLI stores its device token in `~/.lazyskill/config.json`, written `0600`
inside a `0700` directory, with the modes re-applied explicitly because
`mkdir`/`writeFile` modes are subject to umask.

### The QR carries no secrets

It encodes only `${APP_URL}/pair#<code>` — a short-lived code and nothing
else. No API keys, no session, no long-lived token.

**A real bug found and fixed here:** `node-qrcode` silently ignores its
`margin` option in `small` terminal mode, shipping only a single module of
quiet zone where the standard wants four. Finder patterns sitting flush
against terminal text measurably degrades scanning. `renderQr` now adds the
quiet zone itself — two blank rows (each row is two modules tall) and three
extra columns per side on top of the one already present.

`pnpm test` covers it: payload integrity across the encoder's mode-splitting,
error-correction level, that real 32-byte codes stay a modest QR version, that
the quiet zone is present on all four sides, that every row has an identical
visible width, and that the escape wrapper stays balanced so colour cannot
bleed into the terminal. One test asserts that `margin` is *still* ignored, so
if a future version fixes it the workaround gets flagged for removal.

### Agent detection is never assumed

Adapters live one-per-agent under `cli/src/adapters` (§22) and report only
what they can actually find — a config directory or a binary on PATH. Anything
not found is reported as "Not detected", never as ready (§13). `-v` prints the
evidence for each detection so it can be audited.

`lazy-skill install` is deliberately not implemented: rather than shell out to
something unvalidated, it says local install is not wired up yet and points at
the upstream installer that works today. Remote install is Phase 8.

## Phase 6 — scanning and device management

### Two ways in, one code path

A QR scanned with the phone's own camera opens `/pair#<code>`; scanning inside
the app decodes to the same value. Both funnel through `extractCode`, as does
manual entry, so there is exactly one definition of what a code looks like —
shared with the server's validator rather than duplicated.

The fragment is stripped from the address bar as soon as it is read, so a
pairing code never lingers in history or gets shared by accident. Sign-in
drops the fragment, so a code arriving before authentication is stashed in
`sessionStorage` and resumed afterwards.

`/pair` is `noindex`.

### extractCode is an untrusted-input boundary

It parses whatever a camera happened to decode, so it recognises or rejects
and never repairs. Notably it refuses non-http(s) schemes outright: a scanned
`javascript:`, `data:` or `file:` URL carrying a valid-looking fragment is
rejected rather than mined for a code.

`pnpm test` covers 11 cases, weighted toward what it must refuse: dangerous
schemes, wrong lengths at both boundaries, characters outside base64url,
internal whitespace (a mis-scan, never healed) versus surrounding whitespace
(trimmed, because people paste), 100k-character input, and non-string values.

### Camera states are not interchangeable

Permission denied, no camera, no camera API, and an insecure origin each get
their own explanation and their own next step (§11). Telling someone to "try
again" when their browser can never work is worse than saying nothing, so only
the recoverable states offer a retry.

Capability is read as derived state rather than written from an effect: it
cannot change during a session, and mirroring it into state would cost an
extra render on every mount.

Decoding prefers the platform's `BarcodeDetector` where it exists
(hardware-backed on Android/Chrome) and lazily loads jsQR otherwise, which is
what iOS Safari needs — so browsers with the native API never download it.
Frames are downscaled to 640px before decoding; decoding full-resolution
frames every tick drains phone batteries for no accuracy gain. If the native
detector starts throwing mid-scan it is dropped in favour of jsQR rather than
killing the scan.

### Devices

Real device list with online state derived from the CLI's heartbeat, inline
rename, and disconnect. Revoked devices are filtered out in the query rather
than in the UI, so a disconnected machine can never render as connected.
Revoking marks rather than deletes, so installation history survives and the
token stops authenticating immediately.

Live updates come from a Supabase Realtime subscription on `devices`, which
the CLI already heartbeats into — so a machine coming online or a newly
installed agent appears without polling.

## Phase 7 — install adapters

### Verified against the real installer, not the docs

The website's CLI page lists no flags at all. `skills --help` and the package
itself do. Captured from `skills@1.5.23`:

- `skills add <pkg> --agent <ids> --skill '*' --yes [--global]`
- Agent ids are `claude-code`, `codex`, `cursor`, `copilot`, `windsurf`,
  `gemini`, and others — note `claude-code`, not `claude`
- Skills land in `~/.agents/skills/<name>` and are linked into
  `~/.claude/skills`, `~/.codex/skills`, `~/.cursor/skills`

**An unknown `--agent` value is silently ignored** rather than rejected. That
is why `createInstallPlan` validates agent ids itself: passing an unchecked
value through would install somewhere the user never asked for.

### This is not a remote shell

The trust boundary is `cli/src/adapters/install-plan.ts`, which is pure and
executes nothing. A skill reference may arrive from a phone, a server or a
shell argument, so it is validated against an anchored pattern and only ever
emitted as a distinct element of an argv array. The runner spawns a fixed
binary with `shell: false`, so no argument is ever parsed by a shell, and `--`
terminates option parsing.

The most dangerous shape is not a semicolon — it is a reference beginning with
a dash, which the installer would read as a flag rather than a package. Both
are rejected.

The installer version is **pinned**. An unpinned `npx` executes whatever the
registry serves at that moment; a test asserts the pin is an exact version
rather than a tag.

Adapters re-narrow any plan they are handed to their own agent before running,
so an adapter can never install to an agent it does not represent.

The exact command is printed before anything runs, and the user confirms
unless `-y` is passed (§23).

### Tests

26 checks across the CLI. The install-plan suite is weighted toward refusal:
shell metacharacters, flag-shaped references, path traversal, absolute paths,
URLs and `git@` remotes, both length boundaries, unknown agents, and
non-string input. Two further checks assert that no argv element can contain a
metacharacter and that the version pin is exact.

### Two bugs found by running it for real

1. **Progress ran backwards.** The installer prints
   `Agent detected — installing non-interactively` as its *first* line, which
   a bare "installing" keyword test read as the install stage before anything
   had downloaded. Stage matching now uses the installer's real markers, and
   the runner clamps progress to move forward only. A regression test replays
   the captured transcript.
2. **`NO_COLOR` was being ignored.** A developer's inherited `FORCE_COLOR`
   wins over it downstream, putting escape sequences back into the output this
   parser reads. `FORCE_COLOR` is now removed from the child environment
   rather than merely overridden.

### Verified end to end

A real install of `vercel-labs/agent-skills` was run in an isolated temporary
project: 9 skills landed on disk, linked to the single requested agent and no
others, confirmed by `skills list --json`. Project scope (`-p`) exists partly
so this can be tested without writing into a developer's global skills.

## Phase 8 — remote installation

Migration: `supabase/migrations/0004_phase8_remote_install.sql`.

```
phone  →  POST /api/install        queues intent
                                   ↓
CLI    →  POST /api/cli/jobs/claim atomic hand-off, one job to one caller
       →  runs the Phase 7 adapter
       →  POST /api/cli/jobs/progress
                                   ↓
phone  ←  Supabase Realtime on installations
```

### The server queues intent, never commands

A job names one operation from a four-value vocabulary and carries structured
parameters. There is no path, no flag, no version, and no command line
anywhere in the payload — `scope` is a two-value enum, not a directory. A
compromised server can queue a *different* `INSTALL_SKILL`, but it cannot
express anything outside `src/lib/jobs/contract.ts` (§56).

### The CLI does not trust the server

Everything the server sends is re-validated on the device before anything
runs: the command against the vocabulary, the skill reference against the same
anchored pattern used in Phase 7, and the agent list against what this machine
actually has. A job for an agent that is not installed is refused rather than
attempted (§13).

The contract is **deliberately duplicated** — the CLI carries its own copy
rather than importing the server's. A device must not depend on the server for
its definition of what is safe; if the server is compromised, that file is the
only thing between it and the user's machine. `scripts/test-contract-drift.mts`
asserts the two copies stay identical: same vocabularies, same reference
pattern, and identical accept/reject decisions across a battery of hostile
inputs plus 200 random references. If someone loosens one side, the test fails.

### Concurrency and failure

- `claim_next_job` uses `for update skip locked`, so two CLI instances polling
  the same device can never both take the same job.
- Jobs expire after 15 minutes. A laptop that was closed does not wake up and
  install something the user gave up on, and the sweep marks the history rows
  failed with a reason rather than leaving them pending forever.
- Progress is reported per agent, so one failing target does not mark the
  others failed. A job succeeds if any target succeeded, and the per-agent
  errors are still shown.
- Losing a progress update never aborts an install that is otherwise fine.
- The device polls rather than holding a socket: it survives sleep, captive
  portals and proxies, with nothing to reconnect and no long-lived connection
  holding a credential open. Network errors back off exponentially; a revoked
  device is told plainly and stops.

### UI

The install sheet derives its phase from the database rows rather than
tracking it separately, so the screen cannot disagree with what actually
happened. Offline devices are still selectable, with a note that the install
starts when that machine next runs `lazy-skill listen`.

### What is and is not verified

The **local** install path is verified against real installs (Phase 7): 9
skills to disk, correct agent scoping.

The **remote** loop — queue, claim, progress, realtime — is code complete but
has not been run against a live database, because that needs a Supabase
project and a real paired device. Treat it as unproven until it is.

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
