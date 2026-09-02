/** Renders one route in every theme, so the palettes can be compared. */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const THEMES = [
  "cyber-purple",
  "cyber-blue",
  "matrix-green",
  "sakura-pink",
  "sunset-orange",
  "teal-mint",
  "monochrome",
];

const route = process.argv[2] ?? "/pair";
mkdirSync(".shots/themes", { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });

for (const theme of THEMES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 780, deviceScaleFactor: 2 });
  // Seed the stored preference before the page runs its pre-paint script.
  await page.evaluateOnNewDocument((t) => {
    localStorage.setItem("lazyskill.theme", t);
  }, theme);
  await page.goto("http://localhost:3000" + route, { waitUntil: "networkidle0", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 500));

  const applied = await page.evaluate(() => document.documentElement.dataset.theme);
  const accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--ls-accent").trim()
  );
  console.log(`  ${theme.padEnd(15)} applied=${applied === theme ? "yes" : "NO (" + applied + ")"}  accent=${accent}`);

  await page.screenshot({ path: `.shots/themes/${theme}.png` });
  await page.close();
}

await browser.close();
