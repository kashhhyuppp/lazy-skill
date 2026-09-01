import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
mkdirSync(".shots", { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
for (const route of process.argv.slice(2)) {
  const [path, label] = route.split("#");
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto("http://localhost:3000" + path, { waitUntil: "networkidle0", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: `.shots/m-${label}.png` });
  console.log("mobile", path);
  await page.close();
}
await browser.close();
