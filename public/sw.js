/* Lazy Skill service worker.
 *
 * Deliberately small. Its only job is to make the app open instantly and
 * degrade gracefully offline — not to be a caching layer for real data.
 *
 * What it must never cache:
 *   /api/*      pairing codes, device tokens, job state. A replayed pairing
 *               response or a stale job status would be a security problem,
 *               not a stale page.
 *   /auth/*     sessions and OAuth callbacks.
 *   anything non-GET, or cross-origin.
 */
const VERSION = "v1";
const SHELL = `lazyskill-shell-${VERSION}`;
const PAGES = `lazyskill-pages-${VERSION}`;

const PRECACHE = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      // A missing entry must not abort the whole install.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("lazyskill-") && !key.endsWith(VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isCacheable(request, url) {
  if (request.method !== "GET") return false;
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (url.pathname.startsWith("/auth/")) return false;
  // Pairing carries a single-use code in its fragment; nothing about it
  // should survive the request.
  if (url.pathname.startsWith("/pair")) return false;
  return true;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (!isCacheable(request, url)) return;

  // Next's build output is content-hashed, so it is safe to serve from cache
  // first and never revalidate.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(SHELL).then((cache) => cache.put(request, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Pages: network first, so signed-in content is never served stale, with
  // the cache only standing in when the network genuinely fails.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(PAGES).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match("/offline")))
    );
  }
});
