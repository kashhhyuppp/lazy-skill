/**
 * Renders captured terminal output to a PNG.
 *
 * The CLI's whole point is how it looks, and a fenced code block loses the
 * colour, the outlined wordmark and the QR. This converts the real ANSI
 * bytes — truecolor, 256-colour and dim included — into styled HTML and
 * screenshots it, so the README shows what the terminal actually shows.
 */
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const XTERM = (() => {
  // The 256-colour cube, so themes that use it land on the right hue.
  const out = [
    "#000000","#cd0000","#00cd00","#cdcd00","#0000ee","#cd00cd","#00cdcd","#e5e5e5",
    "#7f7f7f","#ff0000","#00ff00","#ffff00","#5c5cff","#ff00ff","#00ffff","#ffffff",
  ];
  const steps = [0, 95, 135, 175, 215, 255];
  for (let r = 0; r < 6; r++) for (let g = 0; g < 6; g++) for (let b = 0; b < 6; b++)
    out.push(`#${[steps[r], steps[g], steps[b]].map((v) => v.toString(16).padStart(2, "0")).join("")}`);
  for (let i = 0; i < 24; i++) {
    const v = (8 + i * 10).toString(16).padStart(2, "0");
    out.push(`#${v}${v}${v}`);
  }
  return out;
})();

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function ansiToHtml(raw) {
  // Drop everything that moves the cursor or clears; keep only colour.
  let text = raw
    .replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, "")
    .replace(/\x1b\[\?[0-9;]*[a-zA-Z]/g, "")
    .replace(/\x1b\[[0-9;]*[ABCDEFGHJKSTfnsu]/g, "")
    .replace(/\x1b[=>]/g, "");

  // A carriage return rewrites the line: keep what survived.
  text = text.split("\n").map((line) => (line.includes("\r") ? line.split("\r").pop() : line)).join("\n");

  let fg = null, bg = null, bold = false, dim = false;
  let open = false;
  let out = "";

  const openSpan = () => {
    const styles = [];
    if (fg) styles.push(`color:${fg}`);
    if (bg) styles.push(`background:${bg}`);
    if (bold) styles.push("font-weight:700");
    if (dim) styles.push("opacity:.55");
    if (!styles.length) return;
    out += `<span style="${styles.join(";")}">`;
    open = true;
  };
  const closeSpan = () => { if (open) { out += "</span>"; open = false; } };

  const parts = text.split(/(\x1b\[[0-9;]*m)/);
  for (const part of parts) {
    const sgr = /^\x1b\[([0-9;]*)m$/.exec(part);
    if (!sgr) { if (part) { closeSpan(); openSpan(); out += esc(part); } continue; }

    const codes = sgr[1] === "" ? [0] : sgr[1].split(";").map(Number);
    for (let i = 0; i < codes.length; i++) {
      const c = codes[i];
      if (c === 0) { fg = bg = null; bold = dim = false; }
      else if (c === 1) bold = true;
      else if (c === 2) dim = true;
      else if (c === 22) { bold = dim = false; }
      else if (c === 39) fg = null;
      else if (c === 49) bg = null;
      else if (c === 38 || c === 48) {
        const target = c === 38;
        if (codes[i + 1] === 2) {
          const [r, g, b] = codes.slice(i + 2, i + 5);
          const hex = `#${[r, g, b].map((v) => (v ?? 0).toString(16).padStart(2, "0")).join("")}`;
          target ? (fg = hex) : (bg = hex);
          i += 4;
        } else if (codes[i + 1] === 5) {
          const hex = XTERM[codes[i + 2]] ?? null;
          target ? (fg = hex) : (bg = hex);
          i += 2;
        }
      }
      else if (c >= 30 && c <= 37) fg = XTERM[c - 30];
      else if (c >= 90 && c <= 97) fg = XTERM[c - 90 + 8];
      else if (c >= 40 && c <= 47) bg = XTERM[c - 40];
    }
  }
  closeSpan();
  return out;
}

const [, , input, output, title = ""] = process.argv;
const body = ansiToHtml(readFileSync(input, "utf8").replace(/\n+$/, ""));

const html = `<!doctype html><meta charset="utf-8"><style>
  body { margin:0; background:#0b0b0f; padding:26px 22px; }
  .chrome { display:flex; gap:7px; align-items:center; margin-bottom:16px; padding-left:2px; }
  .dot { width:11px; height:11px; border-radius:50%; }
  .t { margin-left:9px; font:11px ui-monospace,Menlo,monospace; color:#6b6b78; letter-spacing:.04em; }
  /* line-height must be 1: the wordmark and the QR are built from block and
     half-block characters, and any leading between rows breaks them apart. */
  pre { margin:0; font:13px/1 "SF Mono",Menlo,ui-monospace,monospace;
        color:#d6d6de; white-space:pre; letter-spacing:0; }
</style>
<div class="chrome">
  <span class="dot" style="background:#ff5f57"></span>
  <span class="dot" style="background:#febc2e"></span>
  <span class="dot" style="background:#28c840"></span>
  <span class="t">${esc(title)}</span>
</div>
<pre>${body}</pre>`;

const tmp = output.replace(/\.png$/, ".html");
writeFileSync(tmp, html);

const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 400, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(resolve(tmp)).href, { waitUntil: "load" });
const box = await page.evaluate(() => ({
  w: Math.ceil(document.querySelector("pre").getBoundingClientRect().width) + 46,
  h: Math.ceil(document.body.scrollHeight),
}));
await page.setViewport({ width: Math.max(560, box.w), height: box.h, deviceScaleFactor: 2 });
await page.screenshot({ path: output });
await browser.close();
console.log(`  ${output}  (${Math.max(560, box.w)}x${box.h})`);
