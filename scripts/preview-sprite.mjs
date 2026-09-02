/** Renders the terminal sprite's colour mapping to a PNG, so it can be seen. */
import puppeteer from "puppeteer-core";
import { writeFileSync, mkdirSync } from "node:fs";
import { PX, SPRITE_SIZE, spriteRows } from "../cli/dist/ui/sprite-data.js";
import { THEMES } from "../cli/dist/ui/theme.js";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const theme = THEMES[process.argv[2] ?? "cyber-purple"];

const lift = (c) => Math.round(c + (255 - c) * 0.42);
const rgbCss = ([r, g, b]) => `rgb(${r},${g},${b})`;

function colour(key) {
  if (!key || key === ".") return null;
  if (key === "H") return rgbCss(theme.accent);
  if (key === "L") return rgbCss(theme.accent.map(lift));
  if (key === "h") return rgbCss(theme.accent.map((c) => Math.round(c * 0.52)));
  const v = PX[key];
  return typeof v === "string" ? v : null;
}

const grid = spriteRows(process.argv[3] ?? "idle");
const cell = 14;
let rects = "";
grid.forEach((row, y) => {
  for (let x = 0; x < SPRITE_SIZE; x++) {
    const c = colour(row[x]);
    if (c) rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="${c}"/>`;
  }
});

const size = SPRITE_SIZE * cell;
mkdirSync(".shots", { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
await page.setContent(
  `<style>html,body{margin:0;background:#0b0b10}</style><svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${rects}</svg>`
);
writeFileSync(".shots/cli-sprite.png", await page.screenshot({ type: "png" }));
await browser.close();
console.log("wrote .shots/cli-sprite.png");
