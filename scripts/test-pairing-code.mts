import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { extractCode, isCodeShaped } from "../src/lib/pairing/code.ts";

/**
 * extractCode parses whatever a camera decoded, so it is an untrusted-input
 * boundary. These checks care as much about what it refuses as what it accepts.
 */
let checks = 0;
const check = (label: string, fn: () => void) => {
  fn();
  checks++;
  console.log("  ok  " + label);
};

/** Matches what the server now issues: 16 bytes, 22 characters. */
const realCode = () => randomBytes(16).toString("base64url");

check("accepts a bare code", () => {
  for (let i = 0; i < 50; i++) {
    const code = realCode();
    assert.equal(code.length, 22);
    assert.equal(extractCode(code), code);
    assert.equal(isCodeShaped(code), true);
  }
});

check("accepts a pairing URL and returns only the fragment", () => {
  const code = realCode();
  assert.equal(extractCode(`https://lazyskill.com/pair#${code}`), code);
  assert.equal(extractCode(`  https://lazyskill.com/pair#${code}  `), code);
});

check("accepts the query-string form", () => {
  const code = realCode();
  assert.equal(extractCode(`https://lazyskill.com/pair?c=${code}`), code);
  assert.equal(extractCode(`https://lazyskill.com/pair?code=${code}`), code);
});

check("prefers the fragment over the query when both are present", () => {
  const fragment = realCode();
  const query = realCode();
  assert.equal(extractCode(`https://lazyskill.com/pair?c=${query}#${fragment}`), fragment);
});

check("rejects dangerous URL schemes outright", () => {
  const code = realCode();
  // A scanned QR can contain anything at all. None of these may be treated as
  // a code source, even though they carry a valid-looking fragment.
  assert.equal(extractCode(`javascript:alert(1)#${code}`), null);
  assert.equal(extractCode(`data:text/html,<script>x</script>#${code}`), null);
  assert.equal(extractCode(`file:///etc/passwd#${code}`), null);
  assert.equal(extractCode(`vbscript:msgbox#${code}`), null);
});

check("rejects malformed and empty input", () => {
  const bad = [
    "",
    "   ",
    "not a url",
    "https://lazyskill.com/pair",
    "#",
    "https://lazyskill.com/pair#",
  ];
  for (const value of bad) {
    assert.equal(extractCode(value), null, `should reject ${JSON.stringify(value)}`);
  }
});

check("rejects codes of the wrong length", () => {
  assert.equal(extractCode("a".repeat(19)), null, "19 chars is too short");
  assert.equal(extractCode("a".repeat(65)), null, "65 chars is too long");
  assert.equal(extractCode("a".repeat(20)), "a".repeat(20), "20 is the floor");
  assert.equal(extractCode("a".repeat(64)), "a".repeat(64), "64 is the ceiling");
});

check("still accepts the older 32-byte codes", () => {
  // A code issued before the length change must keep working until it expires.
  const legacy = randomBytes(32).toString("base64url");
  assert.equal(legacy.length, 43);
  assert.equal(extractCode(legacy), legacy);
});

check("rejects characters outside base64url", () => {
  const base = "a".repeat(30);
  // Whitespace is excluded here on purpose: it is trimmed, not rejected.
  const illegal = ["+", "/", "=", "!", "%", "<", ".", ":", "#"];
  for (const ch of illegal) {
    assert.equal(extractCode(base + ch), null, `should reject ${JSON.stringify(ch)}`);
  }
});

check("trims surrounding whitespace but not internal", () => {
  const code = realCode();
  const ws = [" ", String.fromCharCode(9), String.fromCharCode(10), String.fromCharCode(13)];
  for (const pad of ws) {
    assert.equal(extractCode(pad + code + pad), code, "surrounding whitespace should be trimmed");
  }
  // Whitespace inside the code means it was mis-scanned; it must not be healed.
  const split = `${code.slice(0, 20)} ${code.slice(20)}`;
  assert.equal(extractCode(split), null, "internal whitespace must be rejected");
});

check("does not choke on absurdly long input", () => {
  const huge = "https://lazyskill.com/pair#" + "a".repeat(100_000);
  assert.equal(extractCode(huge), null);
});

check("non-string input is rejected rather than coerced", () => {
  for (const value of [null, undefined, 42, {}, []]) {
    assert.equal(extractCode(value as unknown as string), null);
    assert.equal(isCodeShaped(value), false);
  }
});

console.log(`\n${checks} checks passed\n`);
