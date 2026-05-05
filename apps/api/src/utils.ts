import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { pbkdf2Sync } from "node:crypto";

export function makeId(prefix: string) {
  return `${prefix}_${randomBytes(9).toString("base64url")}`;
}

export function makeToken() {
  return `token_${randomBytes(32).toString("base64url")}`;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function previewText(value: unknown, maxLength = 300) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return undefined;
  }

  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1)}...`
    : normalized;
}

export function compareTokenHash(expectedHash: string, token: string) {
  const actualHash = hashToken(token);
  const expected = Buffer.from(expectedHash);
  const actual = Buffer.from(actualHash);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const iterations = 120_000;
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64url");
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  const [scheme, iterationsValue, salt, expectedHash] = passwordHash.split("$");
  if (scheme !== "pbkdf2" || !iterationsValue || !salt || !expectedHash) {
    return false;
  }

  const actualHash = pbkdf2Sync(
    password,
    salt,
    Number(iterationsValue),
    32,
    "sha256"
  ).toString("base64url");
  const expected = Buffer.from(expectedHash);
  const actual = Buffer.from(actualHash);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function toIso(value?: Date | string | null) {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
