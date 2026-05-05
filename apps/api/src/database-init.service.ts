import { Injectable, OnModuleInit } from "@nestjs/common";

import { PrismaService } from "./prisma.service.js";
import { schemaSql } from "./schema-sql.js";

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required before starting the service.");
    }

    await this.prisma.$executeRawUnsafe(schemaSql);
    console.log("Database schema is ready.");
  }
}
