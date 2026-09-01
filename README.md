# Lazy Skill

**See it. Search it. Install it.**

Found an AI skill while scrolling? Stop hunting for the repo, the README, and
the install command buried in step four. Search it here and send it straight to
your AI workspace.

## Status

Phase 1 (brand, design system, core UI) is complete and running locally.
Phases 2–9 are not started. See `docs/PHASES.md`.

## Run it

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Opens on http://localhost:3000.

## Where things live

```
src/app/               routes — (app) is the signed-in shell, / is marketing
src/components/brand/  mascot + logo, authored as pixel grids
src/components/ui/     primitives (Button, Panel, Badge, PixelProgress…)
src/lib/providers/     the only place that knows where skill data comes from
src/lib/themes.ts      the 7 themes; ids are shared with the CLI when pairing
src/types/skill.ts     domain model — unknown fields are null, never guessed
```

## Two rules the code holds to

**Nothing is invented.** Install counts, compatibility, and audit results are
`null` when the source did not report them, and the UI renders "—" or
"unavailable" rather than a plausible-looking default.

**Sample data is always labelled.** Everything currently on screen comes from
`src/lib/providers/demo-data.ts`, is namespaced under a `demo` owner, and
carries a visible badge. It disappears the moment a live provider is wired in.

## Known blocker

The skills.sh API requires a Vercel OIDC token — every endpoint returns 401
without one. Resolving this is the first task of Phase 2.
