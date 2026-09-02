"use client";

import * as React from "react";

/**
 * Registers the service worker after the page is interactive.
 *
 * Deliberately not during load: registration competes with the work the user
 * is actually waiting for, and an app shell that caches half a second later
 * costs nothing.
 */
export function ServiceWorkerRegistration() {
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // A worker registered from a dev server caches development bundles and
    // then serves them after a rebuild, which looks like phantom bugs.
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Blocked by settings or unsupported. The app works without it.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
