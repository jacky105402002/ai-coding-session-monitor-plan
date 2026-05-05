import { randomBytes } from "node:crypto";

export function makeId(prefix: string) {
  return `${prefix}_${randomBytes(9).toString("base64url")}`;
}

export function makeToken() {
  return `token_${randomBytes(32).toString("base64url")}`;
}
