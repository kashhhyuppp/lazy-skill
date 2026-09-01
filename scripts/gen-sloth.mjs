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
// Dome plus a body that flares into shoulders.
ell(16, 14, 12, 11.5, "H");
rect(4, 14, 27, 26, "H");
for (let y = 26; y < H; y++) {
  const spread = Math.min(13, 9.5 + (y - 26) * 1.4);
  rect(Math.round(16 - spread), y, Math.round(15 + spread), y, "H");
}
// Right side falls into shadow, top-left catches the light.
ell(22, 16, 10, 12, "h", { only: "H" });
ell(11, 8, 6.5, 4.5, "L", { only: "H" });

// ---- face opening -----------------------------------------------------
ell(16, 16.5, 8.8, 8.2, "F", { only: "HhL" });
// Cheek tufts break the silhouette so it reads as fur, not a helmet.
[[7.5, 18.5], [7.5, 21], [24.5, 18.5], [24.5, 21]].forEach(([x, y]) => {
  ell(x, y, 1.5, 1.3, "F", { only: "HhL" });
});
// Muzzle sits low in the face.
ell(16, 20.5, 5.0, 3.4, "M", { only: "F" });

// ---- eye patches ------------------------------------------------------
// The dark stripe through the eyes is the sloth's defining marking.
ell(11.2, 15, 3.0, 2.6, "P", { only: "FM" });
ell(20.8, 15, 3.0, 2.6, "P", { only: "FM" });
// The patches taper outward and down, the way the real marking does.
ell(9.0, 17.5, 1.7, 1.7, "P", { only: "FM" });
ell(23.0, 17.5, 1.7, 1.7, "P", { only: "FM" });

// ---- eyes -------------------------------------------------------------
// Only this block varies between expressions; everything else is shared,
// so Bit stays recognisably the same character in every state.
const shut = () => {
  rect(9, 15, 13, 15, "e", "P");
  rect(19, 15, 23, 15, "e", "P");
  put(8, 14, "e");
  put(24, 14, "e");
  put(14, 14, "e");
  put(18, 14, "e");
};
const open = (r = 1.2) => {
  ell(11.2, 15, r, r, "w", { only: "P" });
  ell(20.8, 15, r, r, "w", { only: "P" });
  ell(11.4, 15.2, r * 0.6, r * 0.6, "e", { only: "w" });
  ell(21.0, 15.2, r * 0.6, r * 0.6, "e", { only: "w" });
};
const squint = () => {
  rect(9, 14, 13, 15, "e", "P");
  rect(19, 14, 23, 15, "e", "P");
};

switch (expression) {
  case "curious":
    open(1.5);
    break;
  case "happy":
  case "excited":
    open(1.2);
    break;
  case "waiting":
    shut();
    ell(20.5, 15.5, 1.2, 1.2, "w", { only: "P" });
    ell(20.7, 15.7, 0.8, 0.8, "e", { only: "w" });
    break;
  case "working":
  case "annoyed":
    squint();
    break;
  default:
    shut();
}

// ---- nose + mouth -----------------------------------------------------
// A compact nose with a narrow smile tucked directly beneath it, so the
// features stay legible once the sprite is scaled down to 32px.
rect(15, 18, 16, 19, "n", "MF");
put(14, 21, "n");
put(17, 21, "n");
rect(15, 22, 16, 22, "n", "M");

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
