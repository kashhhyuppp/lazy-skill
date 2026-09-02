import type { MetadataRoute } from "next";

/**
 * PWA manifest.
 *
 * The whole product is "reach for your phone and tap install", so this is not
 * decoration: from the home screen it opens fullscreen with no browser bars,
 * which is the difference between an app and a bookmark.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lazy Skill",
    short_name: "Lazy Skill",
    description:
      "Found an AI skill while scrolling? Search it and install it straight to your computer.",
    start_url: "/home",
    // Landing on the marketing page from a home-screen icon would be odd —
    // someone who installed the app has already been sold.
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#07070b",
    theme_color: "#07070b",
    categories: ["developer", "productivity", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops these to its own shape, so they carry extra margin.
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Search skills",
        short_name: "Search",
        url: "/explore",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Connect computer",
        short_name: "Connect",
        url: "/pair",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
