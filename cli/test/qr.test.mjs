import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { renderQr } from "../dist/ui/qr.js";

/**
 * The QR must survive being decorated. These checks confirm the payload is
 * encoded intact and that the quiet zone is really applied, because a QR that
 * scans unreliably makes the whole product unusable (§10).
 */
// eslint-disable-next-line no-control-regex
const ANSI = /\x1b\[[0-9;]*m/g;
const stripAnsi = (text) => text.replace(ANSI, "");

let checks = 0;
const check = async (label, fn) => {
  await fn();
  checks++;
  console.log("  ok  " + label);
};

/**
 * Reassembles the encoded payload from its segments.
 *
 * node-qrcode splits one string across modes to save space, and each mode
 * stores its data differently: Byte segments hold a Uint8Array, while
 * Alphanumeric and Numeric segments hold a plain string. A decoder that
 * assumes bytes throughout silently corrupts the middle of the URL.
 */
function decodeSegments(qr) {
  return qr.segments
    .map((segment) =>
      segment.mode.id === "Byte"
        ? Buffer.from(segment.data).toString("utf8")
        : String(segment.data)
    )
    .join("");
}

const CODE = "Zm9vYmFyX3Rlc3RfY29kZV93aXRoXzMyX2J5dGVzX29mX2VudA";
const URL_UNDER_TEST = `https://lazyskill.com/pair#${CODE}`;

await check("payload round-trips through the encoder unchanged", () => {
  const qr = QRCode.create(URL_UNDER_TEST, { errorCorrectionLevel: "M" });
  assert.equal(decodeSegments(qr), URL_UNDER_TEST);
});

await check("the pairing code survives intact in the fragment", () => {
  const qr = QRCode.create(URL_UNDER_TEST, { errorCorrectionLevel: "M" });
  assert.ok(decodeSegments(qr).endsWith(CODE), "fragment was altered or truncated");
});

await check("error correction level M is what we asked for", () => {
  const qr = QRCode.create(URL_UNDER_TEST, { errorCorrectionLevel: "M" });
  assert.equal(qr.errorCorrectionLevel.bit, 0, "M is bit value 0");
});

await check("real 32-byte codes stay a modest QR version", () => {
  // Exercise actual CSPRNG output rather than a synthetic string: a run of
  // one repeated character encodes in alphanumeric mode, which is not the
  // mode a real base64url code takes.
  for (let i = 0; i < 25; i++) {
    const code = randomBytes(32).toString("base64url");
    const target = `https://lazyskill.com/pair#${code}`;
    const qr = QRCode.create(target, { errorCorrectionLevel: "M" });

    assert.equal(code.length, 43, "32 bytes must base64url to 43 chars");
    assert.ok(qr.version <= 10, `version ${qr.version} is denser than a terminal renders well`);
    assert.equal(decodeSegments(qr), target, "payload altered for a real code");
  }
});

await check("node-qrcode ignores margin in small terminal mode", async () => {
  // Guards the reason renderQr adds its own quiet zone. If a future version
  // starts honouring margin, this fails and the workaround can be removed.
  const render = (margin) =>
    QRCode.toString(URL_UNDER_TEST, {
      type: "terminal",
      small: true,
      errorCorrectionLevel: "M",
      margin,
    });
  const [tight, padded] = await Promise.all([render(0), render(4)]);
  assert.equal(padded, tight, "margin now has an effect — drop the manual quiet zone");
});

await check("renderQr adds a four-module quiet zone on every side", async () => {
  const lines = await renderQr(URL_UNDER_TEST);
  assert.ok(lines.length > 10, "expected a rendered matrix");

  // Each terminal row is two modules tall, so two blank rows are four modules.
  const blankTop = lines.slice(0, 2);
  const blankBottom = lines.slice(-2);
  for (const line of [...blankTop, ...blankBottom]) {
    assert.equal(stripAnsi(line).trim(), "", "quiet-zone row is not blank");
  }

  const body = lines.slice(2, -2);
  for (const line of body) {
    const visible = stripAnsi(line);
    assert.ok(visible.startsWith("   "), "missing left quiet zone");
    assert.ok(visible.endsWith("   "), "missing right quiet zone");
  }
});

await check("every rendered row is exactly the same visible width", async () => {
  const lines = await renderQr(URL_UNDER_TEST);
  const widths = new Set(lines.map((l) => stripAnsi(l).length));
  assert.equal(widths.size, 1, `ragged rows would tear the quiet zone: ${[...widths]}`);
});

await check("the rendered matrix keeps its escape wrapper balanced", async () => {
  const lines = await renderQr(URL_UNDER_TEST);
  for (const line of lines) {
    assert.ok(line.startsWith("\x1b[47m"), "row must open the light background");
    assert.ok(line.endsWith("\x1b[0m"), "row must reset, or colour bleeds into the terminal");
  }
});

await check("distinct codes produce distinct matrices", () => {
  const a = decodeSegments(QRCode.create("https://lazyskill.com/pair#aaa", {}));
  const b = decodeSegments(QRCode.create("https://lazyskill.com/pair#bbb", {}));
  assert.notEqual(a, b);
});

console.log(`\n${checks} checks passed\n`);
