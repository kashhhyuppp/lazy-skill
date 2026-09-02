import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Lazy Skill — See it. Search it. Install it.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The share card.
 *
 * Drawn rather than screenshotted so it stays legible at the thumbnail size
 * social feeds actually render, and so it cannot go stale when the UI
 * changes. Built from plain divs — the pixel font is not loaded here, because
 * fetching a font would make every share preview depend on a network call.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 90px",
          background:
            "radial-gradient(900px 500px at 50% -10%, rgba(168,85,247,0.28), transparent 70%), #07070b",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          {/* The LS monogram, drawn as blocks so no asset is fetched. */}
          <svg width="96" height="96" viewBox="-1 -3.5 27 27">
            <rect x="2" y="5" width="3" height="12" fill="#ececf4" />
            <rect x="2" y="14" width="8" height="3" fill="#ececf4" />
            <rect x="12" y="5" width="9" height="3" fill="#a855f7" />
            <rect x="12" y="5" width="3" height="6" fill="#a855f7" />
            <rect x="12" y="10" width="9" height="3" fill="#a855f7" />
            <rect x="18" y="10" width="3" height="6" fill="#a855f7" />
            <rect x="12" y="14" width="9" height="3" fill="#a855f7" />
            <rect x="15" y="0" width="5" height="1.5" fill="#5eead4" />
            <rect x="18" y="1.5" width="1.5" height="1" fill="#5eead4" />
            <rect x="16.5" y="2.5" width="1.5" height="1" fill="#5eead4" />
            <rect x="15" y="3.5" width="5" height="1.5" fill="#5eead4" />
            <rect x="20.5" y="2" width="3.5" height="1" fill="#5eead4" />
            <rect x="22.5" y="3" width="1" height="1" fill="#5eead4" />
            <rect x="20.5" y="4" width="3.5" height="1" fill="#5eead4" />
          </svg>
          <div style={{ display: "flex", fontSize: 78, fontWeight: 800, letterSpacing: -2 }}>
            <span style={{ color: "#ececf4" }}>LAZY</span>
            <span style={{ color: "#a855f7", marginLeft: 20 }}>SKILL</span>
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 34, fontSize: 44, fontWeight: 600 }}>
          <span style={{ color: "#5eead4" }}>See it.</span>
          <span style={{ color: "#a855f7", marginLeft: 18 }}>Search it.</span>
          <span style={{ color: "#35d67f", marginLeft: 18 }}>Install it.</span>
        </div>

        <div style={{ display: "flex", marginTop: 30, fontSize: 27, color: "#9a9aae" }}>
          Found an AI skill while scrolling? Stop hunting for it.
        </div>
      </div>
    ),
    size
  );
}
