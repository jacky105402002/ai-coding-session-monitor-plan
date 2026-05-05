import { Injectable, UnauthorizedException } from "@nestjs/common";

import { PrismaService } from "./prisma.service.js";
import { hashPassword, makeId, verifyPassword } from "./utils.js";

const defaultAdminUsername = "jacky105402002";
const defaultAdminPasswordHash =
  "pbkdf2$120000$pbnB02CDrEl7aVyhSF-jkg$_25v2zUKjAsb6Q4PDvckyyEU9VGCvGVfuSt0PS2C0WI";

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async seedDefaultAccounts() {
    const username = process.env.DEFAULT_ADMIN_USERNAME || defaultAdminUsername;
    const passwordHash = process.env.DEFAULT_ADMIN_PASSWORD_HASH || defaultAdminPasswordHash;
    const existing = await this.prisma.appAccount.findUnique({ where: { username } });
    if (existing) {
      return;
    }

    await this.prisma.appAccount.create({
      data: {
        id: makeId("acct"),
        username,
        passwordHash,
        role: "admin",
        displayName: username
      }
    });
    console.log(`Default admin account is ready: ${username}`);
  }

  async login(username: string, password: string) {
    const account = await this.prisma.appAccount.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        role: true,
        displayName: true
      }
    });

    if (!account || !verifyPassword(password, account.passwordHash)) {
      throw new UnauthorizedException("Invalid username or password");
    }

    return {
      id: account.id,
      username: account.username,
      role: account.role,
      displayName: account.displayName
    };
  }

  async listAccounts() {
    return this.prisma.appAccount.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        role: true,
        displayName: true,
        createdAt: true
      }
    });
  }

  async createAccount(input: {
    username?: string;
    password?: string;
    role?: string;
    displayName?: string;
  }) {
    const username = input.username?.trim();
    const password = input.password ?? "";
    const role = input.role === "admin" ? "admin" : "user";

    if (!username || password.length < 8) {
      throw new Error("Username and password with at least 8 characters are required");
    }

    return this.prisma.appAccount.create({
      data: {
        id: makeId("acct"),
        username,
        passwordHash: hashPassword(password),
        role,
        displayName: input.displayName?.trim() || username
      },
      select: {
        id: true,
        username: true,
        role: true,
        displayName: true,
        createdAt: true
      }
    });
  }
}
