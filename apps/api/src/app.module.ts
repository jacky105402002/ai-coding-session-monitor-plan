import { Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "node:path";

import {
  DashboardController,
  DevicesController,
  SessionsController
} from "./app.controller.js";
import { DatabaseInitService } from "./database-init.service.js";
import { MonitorService } from "./monitor.service.js";
import { PrismaService } from "./prisma.service.js";

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), "apps", "web", "dist"),
      exclude: ["/api/(.*)"]
    })
  ],
  controllers: [DashboardController, DevicesController, SessionsController],
  providers: [PrismaService, DatabaseInitService, MonitorService]
})
export class AppModule {}
