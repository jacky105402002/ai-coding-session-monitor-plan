import { PrismaClient } from "@prisma/client";

import { schemaSql } from "../schema-sql.js";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required before starting the service.");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  await prisma.$executeRawUnsafe(schemaSql);
  console.log("Database schema is ready.");
} finally {
  await prisma.$disconnect();
}
