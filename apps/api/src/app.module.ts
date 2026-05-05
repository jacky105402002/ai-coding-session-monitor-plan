import { Module } from "@nestjs/common";

import {
  AdminController,
  AuthController,
  DashboardController,
  DevicesController,
  ProjectsController,
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
    ProjectsController,
    SessionsController,
    WorkspacesController
  ],
  providers: [PrismaService, DatabaseInitService, MonitorService, AccountService]
})
export class AppModule {}
