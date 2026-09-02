import { style, rgb, type Theme } from "../ui/theme.js";

/**
 * Warns when the running copy is behind the published one.
 *
 * npx caches by package name, so `npx lazy-skill` happily keeps running a
 * version it fetched days ago. That turns a fixed bug into a mystery: the
 * user hits something already solved and has no way to know. Telling them
 * plainly costs one request and saves the whole debugging detour.
 *
 * Best-effort by design — never blocks startup, never fails the command.
 */
// The package root, not /latest: the abbreviated-metadata Accept header is
// only valid here, and /latest answers 406 for it.
const REGISTRY = "https://registry.npmjs.org/lazy-skill";
const TIMEOUT_MS = 2500;

function isOlder(current: string, latest: string): boolean {
  const parse = (v: string) => v.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const [a, b] = [parse(current), parse(latest)];
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) < (b[i] ?? 0)) return true;
    if ((a[i] ?? 0) > (b[i] ?? 0)) return false;
  }
  return false;
}

export async function warnIfOutdated(current: string, theme: Theme): Promise<void> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(REGISTRY, {
      signal: controller.signal,
      headers: { Accept: "application/vnd.npm.install-v1+json" },
    });
    clearTimeout(timer);
    if (!res.ok) return;

    const body = (await res.json()) as { "dist-tags"?: { latest?: string } };
    const version = body["dist-tags"]?.latest;
    if (!version || !isOlder(current, version)) return;

    console.log(
      `  ${style.yellow("!")} You are running ${current}; ${style.bold(version)} is out.`
    );
    console.log(
      `    ${style.gray("npx caches, so run")} ${rgb(theme.accent, `npx lazy-skill@${version}`)} ${style.gray("to update.")}`
    );
    console.log();
  } catch {
    // Offline, slow, or the registry is down. None of that should stop a
    // pairing that would otherwise work.
  }
}
