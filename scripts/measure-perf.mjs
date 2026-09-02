/**
 * Measures what a phone actually downloads and how long it waits.
 *
 * Runs against production over a throttled mobile connection, because the
 * numbers on a laptop on wifi say nothing about the person scrolling on 4G.
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.PERF_BASE ?? "https://lazy-skill.vercel.app";
const ROUTES = ["/", "/home", "/explore", "/login", "/pair", "/leaderboard"];

const kb = (n) => (n / 1024).toFixed(0) + "kb";
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const rows = [];

for (const route of ROUTES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  const client = await page.createCDPSession();
  await client.send("Network.enable");
  // Each route is measured as a first visit. Without this the shared bundle
  // is served from cache after the first route and every later page reports
  // zero JavaScript, which flatters the numbers considerably.
  await client.send("Network.setCacheDisabled", { cacheDisabled: true });

  /**
   * Authoritative on-the-wire bytes. content-length is absent on compressed
   * responses and the resource-timing API folds rel=preload into "link", so
   * neither can be trusted for a breakdown; encodedDataLength is what the
   * socket actually carried.
   */
  const seen = new Map();
  const weight = { total: 0, script: 0, css: 0, img: 0, font: 0, html: 0, data: 0, other: 0, count: 0, prefetch: 0 };
  client.on("Network.responseReceived", (e) => {
    seen.set(e.requestId, { type: e.type, url: e.response.url });
  });
  client.on("Network.loadingFinished", (e) => {
    const meta = seen.get(e.requestId);
    if (!meta) return;
    const size = e.encodedDataLength ?? 0;
    weight.total += size;
    weight.count++;
    // Next fetches neighbouring routes on idle. Real bytes, but nobody is
    // waiting on them, so they are counted separately.
    if (meta.url.includes("_rsc=")) {
      weight.prefetch += size;
      weight.data += size;
      return;
    }
    const bucket =
      meta.type === "Script" ? "script" :
      meta.type === "Stylesheet" ? "css" :
      meta.type === "Image" ? "img" :
      meta.type === "Font" ? "font" :
      meta.type === "Document" ? "html" :
      meta.type === "Fetch" || meta.type === "XHR" ? "data" : "other";
    weight[bucket] += size;
  });
  // Fast 4G: what a decent phone signal actually feels like.
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    downloadThroughput: (4 * 1024 * 1024) / 8,
    uploadThroughput: (1 * 1024 * 1024) / 8,
    latency: 80,
  });
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  const started = Date.now();
  await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 60000 });

  const paint = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const done = (lcp) => resolve(lcp);
        try {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            done(Math.round(entries[entries.length - 1].startTime));
          }).observe({ type: "largest-contentful-paint", buffered: true });
        } catch {
          done(null);
        }
        setTimeout(() => done(null), 9000);
      })
  );

  await new Promise((r) => setTimeout(r, 2500));

  const nav = await page.evaluate(() => {
    const n = performance.getEntriesByType("navigation")[0];
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    return {
      ttfb: n ? Math.round(n.responseStart) : null,
      fcp: fcp ? Math.round(fcp.startTime) : null,
      dom: n ? Math.round(n.domContentLoadedEventEnd) : null,
    };
  });

  rows.push({
    route,
    wall: Date.now() - started,
    ...nav,
    lcp: paint,
    ...weight,
  });

  await page.close();
}

await browser.close();

console.log("\nFast 4G, 4x CPU slowdown, iPhone-sized viewport");
console.log("Routes after the first report little JavaScript because the service worker");
console.log("serves it without touching the network. Only the first row is a cold visit.\n");
console.log("route          TTFB    FCP    LCP  |  total     js   html    css   data  reqs  (of which prefetch)");
console.log("─".repeat(96));
for (const r of rows) {
  console.log(
    r.route.padEnd(13) +
      String(r.ttfb ?? "?").padStart(5) +
      "ms" +
      String(r.fcp ?? "?").padStart(6) +
      String(r.lcp ?? "?").padStart(7) +
      "  | " +
      kb(r.total).padStart(7) +
      kb(r.script).padStart(7) +
      kb(r.html).padStart(7) +
      kb(r.css).padStart(7) +
      kb(r.data).padStart(7) +
      String(r.count).padStart(6) +
      kb(r.prefetch).padStart(14)
  );
}

const worst = [...rows].sort((a, b) => (b.lcp ?? 0) - (a.lcp ?? 0))[0];
const heaviest = [...rows].sort((a, b) => b.total - a.total)[0];
console.log(
  `\nslowest paint: ${worst.route} at ${worst.lcp}ms` +
    `\nheaviest page: ${heaviest.route} at ${kb(heaviest.total)}`
);
