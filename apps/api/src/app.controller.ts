import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";

import { requireDevice } from "./auth.js";
import {
  CreateMessageDto,
  CreateSessionDto,
  HeartbeatDto,
  RegisterDeviceDto,
  UpdateSessionStatusDto
} from "./dto.js";
import { MonitorService } from "./monitor.service.js";
import { PrismaService } from "./prisma.service.js";

@ApiTags("dashboard")
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly monitor: MonitorService) {}

  @Get()
  getDashboard() {
    return this.monitor.getDashboardData();
  }
}

@ApiTags("devices")
@Controller("devices")
export class DevicesController {
  constructor(
    private readonly monitor: MonitorService,
    private readonly prisma: PrismaService
  ) {}

  @Post("register")
  register(@Body() body: RegisterDeviceDto) {
    return this.monitor.registerDevice(body);
  }

  @Post("heartbeat")
  @ApiBearerAuth()
  async heartbeat(@Req() request: Request, @Body() body: HeartbeatDto) {
    const authDevice = await requireDevice(request, this.prisma);
    return this.monitor.heartbeat(body.deviceId, authDevice);
  }

  @Delete(":deviceId/sessions")
  @ApiBearerAuth()
  async clearDeviceSessions(@Req() request: Request, @Param("deviceId") deviceId: string) {
    const authDevice = await requireDevice(request, this.prisma);
    return this.monitor.clearDeviceSessions(deviceId, authDevice);
  }
}

@ApiTags("workspaces")
@Controller("workspaces")
export class WorkspacesController {
  constructor(
    private readonly monitor: MonitorService,
    private readonly prisma: PrismaService
  ) {}

  @Delete(":workspaceId/sessions")
  @ApiBearerAuth()
  async clearWorkspaceSessions(
    @Req() request: Request,
    @Param("workspaceId") workspaceId: string
  ) {
    const authDevice = await requireDevice(request, this.prisma);
    return this.monitor.clearWorkspaceSessions(workspaceId, authDevice);
  }
}

@ApiTags("sessions")
@Controller("sessions")
export class SessionsController {
  constructor(
    private readonly monitor: MonitorService,
    private readonly prisma: PrismaService
  ) {}

  @Post()
  @ApiBearerAuth()
  async createSession(@Req() request: Request, @Body() body: CreateSessionDto) {
    const authDevice = await requireDevice(request, this.prisma);
    return this.monitor.createSession(body, authDevice);
  }

  @Patch(":sessionId/status")
  @ApiBearerAuth()
  async updateStatus(
    @Req() request: Request,
    @Param("sessionId") sessionId: string,
    @Body() body: UpdateSessionStatusDto
  ) {
    const authDevice = await requireDevice(request, this.prisma);
    return this.monitor.updateSessionStatus(sessionId, body, authDevice);
  }

  @Post(":sessionId/messages")
  @ApiBearerAuth()
  async createMessage(
    @Req() request: Request,
    @Param("sessionId") sessionId: string,
    @Body() body: CreateMessageDto
  ) {
    const authDevice = await requireDevice(request, this.prisma);
    return this.monitor.createMessage(sessionId, body, authDevice);
  }

  @Delete(":sessionId")
  @ApiBearerAuth()
  async deleteSession(@Req() request: Request, @Param("sessionId") sessionId: string) {
    const authDevice = await requireDevice(request, this.prisma);
    return this.monitor.deleteSession(sessionId, authDevice);
  }
}
