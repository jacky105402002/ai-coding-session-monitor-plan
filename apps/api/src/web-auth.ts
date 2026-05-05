import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

import { PrismaService } from "./prisma.service.js";

export type AccountSession = {
  id: string;
  username: string;
  role: string;
  displayName?: string | null;
};

const cookieName = "monitor_session";

function authSecret() {
  return process.env.AUTH_SECRET || process.env.DATABASE_URL || "dev-monitor-secret";
}

function sign(value: string) {
  return createHmac("sha256", authSecret()).update(value).digest("base64url");
}

function parseCookies(header?: string) {
  const cookies = new Map<string, string>();
  for (const part of header?.split(";") ?? []) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName) {
      cookies.set(rawName, decodeURIComponent(rawValue.join("=")));
    }
  }
  return cookies;
}

export function issueSessionCookie(response: Response, account: AccountSession) {
  const payload = Buffer.from(
    JSON.stringify({
      id: account.id,
      nonce: randomBytes(8).toString("base64url"),
      issuedAt: Date.now()
    })
  ).toString("base64url");
  const token = `${payload}.${sign(payload)}`;

  response.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 7
  });
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(cookieName, { path: "/" });
}

export async function requireAccount(
  request: Request,
  prisma: PrismaService,
  requiredRole?: "admin"
): Promise<AccountSession> {
  const token = parseCookies(request.headers.cookie).get(cookieName);
  if (!token) {
    throw new UnauthorizedException("Login required");
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    throw new UnauthorizedException("Invalid session");
  }

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new UnauthorizedException("Invalid session");
  }

  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    id?: string;
  };
  if (!decoded.id) {
    throw new UnauthorizedException("Invalid session");
  }

  const account = await prisma.appAccount.findUnique({
    where: { id: decoded.id },
    select: { id: true, username: true, role: true, displayName: true }
  });
  if (!account) {
    throw new UnauthorizedException("Invalid session");
  }

  if (requiredRole === "admin" && account.role !== "admin") {
    throw new ForbiddenException("Admin role required");
  }

  return account;
}
