import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Pairing codes and device tokens.
 *
 * A pairing code is on screen and photographed, so treat it as public the
 * moment it renders. Its only protections are that it is unguessable, expires
 * in two minutes, and can be claimed exactly once — and claiming it requires
 * a signed-in user. It carries no authority by itself.
 *
 * Only HMACs are stored. A database leak therefore yields nothing replayable,
 * because the pepper lives in the environment rather than the table.
 */

export const PAIRING_TTL_MS = 2 * 60 * 1000;

function pepper(): string {
  const secret = process.env.PAIRING_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "PAIRING_SECRET must be set to at least 32 characters before pairing can be used."
    );
  }
  return secret;
}

/** 32 bytes of CSPRNG entropy, URL-safe so it survives a QR and a query string. */
export function generateCode(): string {
  return randomBytes(32).toString("base64url");
}

export function generateDeviceToken(): string {
  return `lsk_${randomBytes(32).toString("base64url")}`;
}

export function hashSecret(value: string): string {
  return createHmac("sha256", pepper()).update(value).digest("hex");
}

/** Constant-time compare, so a hash cannot be recovered by timing. */
export function secretMatches(value: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashSecret(value), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function isPairingConfigured(): boolean {
  return Boolean(process.env.PAIRING_SECRET && process.env.PAIRING_SECRET.length >= 32);
}
