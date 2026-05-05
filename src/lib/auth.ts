import { createHash, timingSafeEqual } from "node:crypto";

import { query } from "./db";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
}

export async function requireDevice(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);
  const result = await query<{
    id: string;
    user_id: string;
    token_hash: string;
  }>(
    "select id, user_id, token_hash from devices where token_hash = $1 limit 1",
    [tokenHash]
  );

  const device = result.rows[0];
  if (!device) {
    return null;
  }

  const expected = Buffer.from(device.token_hash);
  const actual = Buffer.from(tokenHash);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }

  return {
    id: device.id,
    userId: device.user_id
  };
}
