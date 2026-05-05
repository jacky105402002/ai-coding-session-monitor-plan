import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
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
}
