import { Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "node:path";

import {
  AdminController,
  AuthController,
  DashboardController,
  DevicesController,
  SessionsController,
  WorkspacesController
} from "./app.controller.js";
import { DatabaseInitService } from "./database-init.service.js";
import { AccountService } from "./account.service.js";
import { MonitorService } from "./monitor.service.js";
import { PrismaService } from "./prisma.service.js";

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), "apps", "web", "dist"),
      exclude: ["/api/(.*)"]
    })
  ],
  controllers: [
    DashboardController,
    AuthController,
    AdminController,
    DevicesController,
    SessionsController,
    WorkspacesController
  ],
  providers: [PrismaService, DatabaseInitService, MonitorService, AccountService]
})
export class AppModule {}
