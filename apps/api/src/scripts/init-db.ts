import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { schemaStatements } from "../schema-sql.js";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required before starting the service.");
  process.exit(1);
}

const prisma = new PrismaClient();
const defaultAdminUsername = "jacky105402002";
const defaultAdminPasswordHash =
  "pbkdf2$120000$pbnB02CDrEl7aVyhSF-jkg$_25v2zUKjAsb6Q4PDvckyyEU9VGCvGVfuSt0PS2C0WI";

try {
  for (const statement of schemaStatements) {
    await prisma.$executeRawUnsafe(statement);
  }
  await prisma.appAccount.upsert({
    where: { username: process.env.DEFAULT_ADMIN_USERNAME || defaultAdminUsername },
    update: {},
    create: {
      id: `acct_${randomUUID().replaceAll("-", "").slice(0, 18)}`,
      username: process.env.DEFAULT_ADMIN_USERNAME || defaultAdminUsername,
      passwordHash: process.env.DEFAULT_ADMIN_PASSWORD_HASH || defaultAdminPasswordHash,
      role: "admin",
      displayName: process.env.DEFAULT_ADMIN_USERNAME || defaultAdminUsername
    }
  });
  console.log("Database schema is ready.");
} finally {
  await prisma.$disconnect();
}
