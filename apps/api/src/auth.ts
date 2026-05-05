import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

import { PrismaService } from "./prisma.service.js";
import { hashToken } from "./utils.js";

export type AuthDevice = {
  id: string;
  userId: string;
};

export function getBearerToken(request: Request) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
}

export async function requireDevice(
  request: Request,
  prisma: PrismaService
): Promise<AuthDevice> {
  const token = getBearerToken(request);
  if (!token) {
    throw new UnauthorizedException("Unauthorized");
  }

  const device = await prisma.device.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true }
  });

  if (!device) {
    throw new UnauthorizedException("Unauthorized");
  }

  return device;
}
