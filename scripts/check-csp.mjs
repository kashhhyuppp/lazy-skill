/**
 * A page can return 200 while its CSP quietly blocks the scripts that make it
 * work. Only a real browser reports that, so load each page and listen for
 * violations and blocked requests.
 */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "https://lazy-skill.vercel.app";

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
let violations = 0, failures = 0;

for (const route of ["/", "/home", "/explore", "/login", "/pair", "/leaderboard", "/offline"]) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const hits = [];
  page.on("console", (m) => {
    const t = m.text();
    if (/Content Security Policy|Refused to/i.test(t)) hits.push("CSP: " + t.slice(0, 150));
  });
  page.on("pageerror", (e) => hits.push("JS: " + String(e.message).slice(0, 120)));
  page.on("requestfailed", (r) => {
    const f = r.failure()?.errorText ?? "";
    if (/BLOCKED/i.test(f)) hits.push(`BLOCKED ${r.url().slice(0, 80)}`);
  });

  await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 40000 });
  await new Promise((r) => setTimeout(r, 5000));

  // Did React actually mount and hydrate? A dead CSP shows a blank shell.
  const alive = await page.evaluate(() => ({
    buttons: document.querySelectorAll("button, a").length,
    text: document.body.innerText.trim().length,
  }));

  const bad = [...new Set(hits)];
  violations += bad.filter((h) => h.startsWith("CSP") || h.startsWith("BLOCKED")).length;
  failures += bad.filter((h) => h.startsWith("JS")).length;

  console.log(`  ${bad.length === 0 ? "ok  " : "HITS"} ${route.padEnd(13)} ${alive.buttons} controls, ${alive.text} chars of text`);
  for (const h of bad) console.log("        " + h);
  await page.close();
}

await browser.close();
console.log(`\n${violations} CSP violations, ${failures} page errors`);
