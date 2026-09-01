/** Screenshots local routes into .shots/ for visual review. */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.SHOT_BASE ?? "http://localhost:3000";
const routes = process.argv.slice(2);
if (!routes.length) routes.push("/", "/home", "/explore");

mkdirSync(".shots", { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });

for (const route of routes) {
  const [path, label = route.replace(/\W+/g, "_") || "root"] = route.split("#");
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 2 });
  await page.goto(BASE + path, { waitUntil: "networkidle0", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: `.shots/${label}.png` });
  console.log("shot", path, "->", `.shots/${label}.png`);
  await page.close();
}
await browser.close();
