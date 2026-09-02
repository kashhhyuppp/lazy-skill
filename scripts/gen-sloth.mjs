/**
 * Rasterises the Lazy Skill mascot into a character grid.
 * Drawing by hand at 32x32 is error-prone; composing from shape functions
 * keeps every row exactly W wide and lets the sprite be tuned numerically.
 *
 * Run: node scripts/gen-sloth.mjs [--emit]
 */
const W = 32, H = 32;

export function draw(expression) {
const grid = Array.from({ length: H }, () => Array(W).fill("."));
const put = (x, y, ch) => {
  if (x >= 0 && x < W && y >= 0 && y < H) grid[y][x] = ch;
};

const ell = (cx, cy, rx, ry, ch, { only = null, squashTop = 0 } = {}) => {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dy = (y - cy) / ry;
      const dx = (x - cx) / rx;
      if (dx * dx + dy * dy <= 1) {
        if (squashTop && y < cy - ry * squashTop) continue;
        if (only && !only.includes(grid[y][x])) continue;
        put(x, y, ch);
      }
    }
  }
};

const rect = (x0, y0, x1, y1, ch, only = null) => {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (only && !only.includes(grid[y]?.[x])) continue;
      put(x, y, ch);
    }
};

// ---- hood -------------------------------------------------------------
// A rounded hood that frames the face rather than swallowing it.
ell(16, 13, 12, 11, "H");
rect(4, 13, 27, 25, "H");
for (let y = 25; y < H; y++) {
  const spread = Math.min(13, 9 + (y - 25) * 1.4);
  rect(Math.round(16 - spread), y, Math.round(15 + spread), y, "H");
}
// Shadow down the right, a soft lit edge along the top-left rim only — a
// highlight blob in the middle of the hood reads as a stain, not a light.
ell(22, 15, 10.5, 12, "h", { only: "H" });
ell(13, 6, 7, 3.2, "L", { only: "H" });

// ---- face ---------------------------------------------------------------
ell(16, 16, 9.2, 8.4, "F", { only: "HhL" });
// Cheek fur breaking the hood line, so the silhouette is not a plain oval.
[[6.8, 17.5], [6.8, 20.5], [25.2, 17.5], [25.2, 20.5]].forEach(([x, y]) => {
  ell(x, y, 1.6, 1.4, "F", { only: "HhL" });
});
// Muzzle: lighter, low, and wide enough to read at a glance.
ell(16, 20.5, 4.8, 3.2, "M", { only: "F" });

// ---- eye patches --------------------------------------------------------
// The sloth's defining marking. Angled outward and down, and crucially NOT
// solid: the eye sits inside as a bright shape, or the whole patch reads as
// a dark rectangle with nothing in it.
// Kept small and well separated. Wide patches meeting in the middle read as
// one dark band across the face rather than two eyes.
ell(11.4, 14.6, 2.6, 2.3, "P", { only: "FM" });
ell(20.6, 14.6, 2.6, 2.3, "P", { only: "FM" });
// A short taper down and out, which is what makes it a sloth rather than a
// bandit mask.
ell(9.4, 17.2, 1.5, 1.6, "P", { only: "FM" });
ell(22.6, 17.2, 1.5, 1.6, "P", { only: "FM" });

// ---- eyes -------------------------------------------------------------
// Only this block varies between expressions; everything else is shared, so
// Bit stays recognisably the same character in every state.
//
// A closed eye is a bright lid line against the dark patch. Drawn in another
// dark brown it disappears, and the patch reads as an empty rectangle — which
// is exactly what made the face look like a blob.
const shut = () => {
  rect(10, 14, 13, 14, "w", "P");
  rect(19, 14, 22, 14, "w", "P");
  rect(10, 15, 13, 15, "e", "P");
  rect(19, 15, 22, 15, "e", "P");
};
const open = (r = 1.5) => {
  ell(11.4, 14.6, r, r, "w", { only: "P" });
  ell(20.6, 14.6, r, r, "w", { only: "P" });
  ell(11.6, 14.8, r * 0.55, r * 0.55, "e", { only: "w" });
  ell(20.8, 14.8, r * 0.55, r * 0.55, "e", { only: "w" });
};
const squint = () => {
  rect(10, 14, 13, 14, "w", "P");
  rect(19, 14, 22, 14, "w", "P");
};

switch (expression) {
  case "curious":
    open(1.8);
    break;
  case "happy":
  case "excited":
    open(1.5);
    break;
  case "waiting":
    shut();
    open(1.4);
    rect(10, 14, 13, 15, "e", "w");
    break;
  case "working":
  case "annoyed":
    squint();
    break;
  default:
    shut();
}

// ---- nose + mouth -------------------------------------------------------
rect(14, 18, 17, 19, "n", "MF");
put(15, 20, "n");
put(16, 20, "n");
put(13, 21, "n");
put(18, 21, "n");
rect(14, 22, 17, 22, "n", "M");

// ---- outline ----------------------------------------------------------
// One-pixel dark edge wherever a lit cell touches transparency.
const solid = (x, y) => grid[y]?.[x] && grid[y][x] !== ".";
const edges = [];
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    if (solid(x, y) && (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1)))
      edges.push([x, y]);
edges.forEach(([x, y]) => put(x, y, "o"));

return grid.map((r) => r.join(""));
}

export const EXPRESSIONS = [
  "idle", "curious", "waiting", "happy", "working", "excited", "annoyed",
];
export const SIZE = W;
