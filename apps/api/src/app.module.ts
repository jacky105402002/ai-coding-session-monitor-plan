import { Module } from "@nestjs/common";

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
  imports: [],
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
