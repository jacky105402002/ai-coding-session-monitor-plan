import { Injectable, OnModuleInit } from "@nestjs/common";

import { PrismaService } from "./prisma.service.js";
import { schemaStatements } from "./schema-sql.js";

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required before starting the service.");
    }

    for (const statement of schemaStatements) {
      await this.prisma.$executeRawUnsafe(statement);
    }
    console.log("Database schema is ready.");
  }
}
