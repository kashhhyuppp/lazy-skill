/**
 * Walks the app at phone size, signed in, and exercises every interactive
 * element it can find.
 *
 * The point is to catch the class of bug that typechecks and lints clean but
 * does nothing when tapped — a handler that was never wired, a link with no
 * href, a control that throws in the console and swallows it.
 */
import puppeteer from "puppeteer-core";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.AUDIT_BASE ?? "https://lazy-skill.vercel.app";
const OUT = ".shots/audit";

const cookie = JSON.parse(readFileSync(process.env.CLAUDE_JOB_DIR + "/tmp/.auditcookie", "utf8"));

const ROUTES = [
  "/",
  "/home",
  "/explore",
  "/favorites",
  "/library",
  "/profile",
  "/devices",
  "/leaderboard",
  "/pair",
  "/login",
  "/offline",
];

/**
 * Lessons from the first run, which reported 158 failures of which almost
 * none were real:
 *
 *  - `networkidle0` never settles here: the app polls and holds a realtime
 *    connection, so waiting on it times out on every page.
 *  - Querying the whole document finds the desktop sidebar, which is in the
 *    DOM but hidden at phone width. Clicking a hidden element does nothing,
 *    which looked like a dead control.
 *  - /login redirects to /home when signed in, so every control measured on
 *    that route belonged to a different page.
 *  - A URL comparison calls anything that does not navigate "dead", which
 *    wrongly condemns toggles, tabs already selected, and load-more.
 *
 * And from the second and third runs:
 *
 *  - Controls were tagged by array index, then the page was reloaded between
 *    clicks. The DOM differs after a reload, so index N pointed at a
 *    different element and every click after the first navigation tested the
 *    wrong thing.
 *  - Re-reading a toggle by aria-label finds a *different* control once the
 *    label flips from "Add to favorites" to "Remove from favorites" — which
 *    reported a working heart as dead.
 *  - Four seconds is not enough for a page that fetches from a registry
 *    routinely taking six.
 *
 * Every failure this tool has ever reported was verified by hand before being
 * acted on, and exactly one was real. Treat its output as a list of things to
 * check, never as a list of bugs.
 */
const findings = [];
const note = (route, level, what, detail = "") =>
  findings.push({ route, level, what, detail });

mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });

/** Everything a thumb could plausibly hit. */
const COLLECT = `(() => {
  const out = [];
  const seen = new Set();
  document.querySelectorAll('button, a, [role="button"], input, select, summary').forEach((el, i) => {
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') return;
    // The desktop sidebar is present but hidden at phone width. Its links are
    // unreachable by a thumb, and clicking them does nothing — which is not a
    // bug in the control.
    if (el.closest('aside')) return;
    if (el.offsetParent === null && style.position !== 'fixed') return;

    const label =
      (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.tagName)
        .replace(/\\s+/g, ' ')
        .trim()
        .slice(0, 48) || el.tagName;

    const key = el.tagName + '|' + label + '|' + Math.round(box.top);
    if (seen.has(key)) return;
    seen.add(key);

    out.push({
      // Identified by what it is, not where it was. Index-based ids broke
      // the moment the page re-rendered differently after a reload: id N
      // then pointed at a different control, so every click after the first
      // navigation tested the wrong element and reported a false failure.
      key: (el.getAttribute('aria-label') || '') + '|' + (el.getAttribute('href') || '') + '|' + label,
      tag: el.tagName.toLowerCase(),
      label,
      href: el.getAttribute('href'),
      disabled: el.disabled === true || el.getAttribute('aria-disabled') === 'true',
      type: el.getAttribute('type'),
      // A control with no href, no type=submit and no listener is the shape of
      // a button that was never wired up.
      tiny: box.width < 32 || box.height < 32,
      w: Math.round(box.width),
      h: Math.round(box.height),
    });
  });
  return out;
})()`;

for (const route of ROUTES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.setCookie({ ...cookie, domain: new URL(BASE).hostname, path: "/" });

  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200));
  });
  page.on("requestfailed", (r) => failedRequests.push(`${r.method()} ${r.url().slice(0, 90)}`));
  page.on("response", (r) => {
    if (r.status() >= 400 && new URL(r.url()).hostname === new URL(BASE).hostname) {
      failedRequests.push(`HTTP ${r.status()} ${r.url().replace(BASE, "").slice(0, 70)}`);
    }
  });

  let ok = true;
  try {
    const res = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30000 });
    if (!res || res.status() >= 400) {
      note(route, "FAIL", `page returned ${res?.status()}`);
      ok = false;
    }
  } catch (err) {
    note(route, "FAIL", "page did not load", String(err.message).slice(0, 120));
    ok = false;
  }

  if (!ok) {
    await page.close();
    continue;
  }

  await new Promise((r) => setTimeout(r, 1800));

  const landed = new URL(page.url()).pathname;
  if (landed !== route) {
    note(route, "INFO", `redirects to ${landed}`);
    // Measuring the destination under this route's name would attribute its
    // controls to the wrong page.
    await page.close();
    continue;
  }

  // Does anything overflow the viewport horizontally?
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  if (overflow > 2) note(route, "WARN", `horizontal overflow of ${overflow}px`);

  const controls = await page.evaluate(COLLECT);
  const slug = route === "/" ? "root" : route.replace(/\//g, "_").replace(/^_/, "");
  await page.screenshot({ path: `${OUT}/${slug}.png` });

  console.log(`\n${route}  (${controls.length} controls)`);

  for (const c of controls) {
    if (c.disabled) {
      console.log(`   -    ${c.label}  (disabled)`);
      continue;
    }
    if (c.tiny) note(route, "WARN", `tap target ${c.w}x${c.h}px is under 32px`, c.label);

    // Watch for any observable effect: navigation, a dialog, DOM change.
    const before = await page.evaluate(() => ({
      url: location.pathname + location.search,
      html: document.body.innerHTML.length,
      dialogs: document.querySelectorAll('[role="dialog"]').length,
    }));

    // Find it fresh, scroll it into view, and click its centre with the real
    // mouse — page.click can land on a sticky header or the bottom bar when
    // the target sits underneath one.
    const spot = await page.evaluate((key) => {
      const el = [...document.querySelectorAll('button, a, [role="button"], input, select, summary')].find(
        (e) => {
          if (e.closest('aside')) return false;
          const label = (e.getAttribute('aria-label') || e.textContent || e.getAttribute('placeholder') || e.tagName)
            .replace(/\s+/g, ' ').trim().slice(0, 48);
          return (e.getAttribute('aria-label') || '') + '|' + (e.getAttribute('href') || '') + '|' + label === key;
        }
      );
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return null;
      return {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
        pressed: el.getAttribute('aria-pressed'),
      };
    }, c.key);

    if (!spot) {
      console.log(`   ?    ${c.label}  (gone after reload)`);
      continue;
    }

    try {
      await page.mouse.click(spot.x, spot.y);
    } catch {
      note(route, "WARN", "control could not be clicked", c.label);
      continue;
    }

    // Skill pages are rendered on demand and hit a registry that regularly
    // takes several seconds, so a short wait reports a working link as dead.
    await new Promise((r) => setTimeout(r, c.href?.startsWith("/skills/") ? 9000 : 4000));

    const after = await page.evaluate(() => ({
      url: location.pathname + location.search,
      html: document.body.innerHTML.length,
      dialogs: document.querySelectorAll('[role="dialog"]').length,
    }));

    // A toggle's DOM change is tiny — a filled heart is a few characters —
    // so aria-pressed is checked directly rather than inferred from size.
    const toggled = await page.evaluate((key) => {
      const el = [...document.querySelectorAll('button, a, [role="button"]')].find((e) => {
        const label = (e.getAttribute('aria-label') || e.textContent || e.tagName)
          .replace(/\s+/g, ' ').trim().slice(0, 48);
        return (e.getAttribute('aria-label') || '') + '|' + (e.getAttribute('href') || '') + '|' + label === key;
      });
      // A missing element usually means its own label changed, which is
      // itself proof the control did something.
      return el ? el.getAttribute('aria-pressed') : 'label-changed';
    }, c.key);

    const navigated = before.url !== after.url;
    const opened = after.dialogs > before.dialogs;
    const changed = Math.abs(after.html - before.html) > 40 || toggled !== spot.pressed;

    let verdict;
    if (navigated) verdict = `→ ${after.url}`;
    else if (opened) verdict = "opened a dialog";
    else if (changed) verdict = "changed the page";
    else {
      verdict = "no visible change";
      const inert =
        c.tag === "input" ||
        c.tag === "select" ||
        /search|email|code/i.test(c.label) ||
        // A link to the page you are already on correctly does nothing.
        (c.href && c.href === route);
      // Only an href that should have taken us elsewhere is a real failure.
      if (!inert && c.href && c.href !== route && !c.href.startsWith("#")) {
        note(route, "FAIL", `link to ${c.href} did not navigate`, c.label);
      } else if (!inert && !c.href) {
        note(route, "WARN", "button had no visible effect", c.label);
      }
    }

    console.log(`   ${verdict === "NO EFFECT" ? "FAIL" : "ok  "} ${c.label.padEnd(34)} ${verdict}`);

    // Return to a known state before the next control.
    if (navigated || opened || changed) {
      await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  for (const e of [...new Set(consoleErrors)]) note(route, "WARN", "console error", e);
  for (const f of [...new Set(failedRequests)]) note(route, "WARN", "request failed", f);

  await page.close();
}

await browser.close();

writeFileSync(`${OUT}/findings.json`, JSON.stringify(findings, null, 2));

console.log("\n\n=================== FINDINGS ===================");
const fails = findings.filter((f) => f.level === "FAIL");
const warns = findings.filter((f) => f.level === "WARN");

if (fails.length === 0) console.log("\nno failures");
for (const f of fails) console.log(`FAIL  ${f.route.padEnd(13)} ${f.what}  ${f.detail}`);
console.log("");
for (const f of warns) console.log(`warn  ${f.route.padEnd(13)} ${f.what}  ${f.detail}`);
console.log(`\n${fails.length} failures, ${warns.length} warnings\n`);
