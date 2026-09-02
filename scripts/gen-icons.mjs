/**
 * Renders the app icons from the same LS monogram the UI uses.
 *
 * Generated rather than hand-exported so the icon can never drift from the
 * logo: change the mark, re-run this, and every size follows.
 */
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "public/icons";

const ACCENT = "#a855f7";
const SUPPORT = "#5eead4";
const INK = "#ececf4";
const BG = "#07070b";

/**
 * The monogram, matching src/components/brand/logo.tsx exactly.
 *
 * `margin` widens the viewBox rather than scaling the artwork down. The Zz
 * sits flush against the top and right of the 24-unit grid, so at margin 0 it
 * renders clipped — an icon has to have room around the mark, not just be the
 * mark stretched to the edges.
 */
function mark({ margin = 2, background = "none" }) {
  // The drawn artwork does not fill the 24-unit grid: the L/S body sits at
  // y 5-17, while the Zz reaches y 0 and x 24. Centring the grid therefore
  // leaves the mark visibly high and left. Centre the content's own bounds
  // instead.
  const bounds = { x0: 2, y0: 0, x1: 24, y1: 17 };
  const cx = (bounds.x0 + bounds.x1) / 2;
  const cy = (bounds.y0 + bounds.y1) / 2;
  const span = Math.max(bounds.x1 - bounds.x0, bounds.y1 - bounds.y0) + margin * 2;
  const minX = cx - span / 2;
  const minY = cy - span / 2;

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${span} ${span}" width="512" height="512" shape-rendering="crispEdges">
  <rect x="${minX}" y="${minY}" width="${span}" height="${span}" fill="${background}"/>
  <g>
    <rect x="2"  y="5"  width="3" height="12" fill="${INK}"/>
    <rect x="2"  y="14" width="8" height="3"  fill="${INK}"/>
    <rect x="12" y="5"  width="9" height="3"  fill="${ACCENT}"/>
    <rect x="12" y="5"  width="3" height="6"  fill="${ACCENT}"/>
    <rect x="12" y="10" width="9" height="3"  fill="${ACCENT}"/>
    <rect x="18" y="10" width="3" height="6"  fill="${ACCENT}"/>
    <rect x="12" y="14" width="9" height="3"  fill="${ACCENT}"/>
    <g fill="${SUPPORT}">
      <rect x="15"   y="0"   width="5"   height="1.5"/>
      <rect x="18"   y="1.5" width="1.5" height="1"/>
      <rect x="16.5" y="2.5" width="1.5" height="1"/>
      <rect x="15"   y="3.5" width="5"   height="1.5"/>
      <rect x="20.5" y="2"   width="3.5" height="1"/>
      <rect x="22.5" y="3"   width="1"   height="1"/>
      <rect x="20.5" y="4"   width="3.5" height="1"/>
    </g>
  </g>
</svg>`.trim();
}

const targets = [
  { file: "icon-192.png", size: 192, svg: mark({ margin: 3, background: BG }) },
  { file: "icon-512.png", size: 512, svg: mark({ margin: 3, background: BG }) },
  // Android crops maskable icons to a circle, keeping only the middle ~80%,
  // so these need far more margin or the corners of the mark are sliced off.
  { file: "maskable-192.png", size: 192, svg: mark({ margin: 8, background: BG }) },
  { file: "maskable-512.png", size: 512, svg: mark({ margin: 8, background: BG }) },
  // iOS ignores maskable and never adds a background, so this ships its own.
  { file: "apple-touch-icon.png", size: 180, svg: mark({ margin: 4, background: BG }) },
  { file: "favicon-32.png", size: 32, svg: mark({ margin: 2, background: BG }) },
];

mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const page = await browser.newPage();

for (const { file, size, svg } of targets) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`
  );
  const buffer = await page.screenshot({ omitBackground: true, type: "png" });
  writeFileSync(`${OUT}/${file}`, buffer);
  console.log(`  ${file.padEnd(24)} ${size}x${size}`);
}

await browser.close();
console.log("\nicons written to " + OUT);
