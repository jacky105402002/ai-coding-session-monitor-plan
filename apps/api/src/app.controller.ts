import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";

import { requireDevice } from "./auth.js";
import { AccountService } from "./account.service.js";
import {
  CreateAccountDto,
  CreateMessageDto,
  CreateProjectBindingDto,
  CreateSessionDto,
  HeartbeatDto,
  LoginDto,
  RegisterDeviceDto,
  UpdateSessionStatusDto
} from "./dto.js";
import { MonitorService } from "./monitor.service.js";
import { PrismaService } from "./prisma.service.js";
import {
  clearSessionCookie,
  issueSessionCookie,
  requireAccount
} from "./web-auth.js";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly accounts: AccountService,
    private readonly prisma: PrismaService
  ) {}

  @Post("login")
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const account = await this.accounts.login(body.username, body.password);
    issueSessionCookie(response, account);
    return { account };
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) response: Response) {
    clearSessionCookie(response);
    return { ok: true };
  }

  @Get("me")
  async me(@Req() request: Request) {
    const account = await requireAccount(request, this.prisma);
    return { account };
  }
}

@ApiTags("dashboard")
@Controller("dashboard")
export class DashboardController {
  constructor(
    private readonly monitor: MonitorService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  async getDashboard(@Req() request: Request) {
    await requireAccount(request, this.prisma);
    return this.monitor.getDashboardData();
  }
}

@ApiTags("projects")
@Controller("projects")
export class ProjectsController {
  constructor(
    private readonly monitor: MonitorService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  async listProjects(@Req() request: Request) {
    await requireAccount(request, this.prisma);
    return { projects: await this.monitor.listProjectBindings() };
  }
}

@ApiTags("admin")
@Controller("admin")
export class AdminController {
  constructor(
    private readonly monitor: MonitorService,
    private readonly accounts: AccountService,
    private readonly prisma: PrismaService
  ) {}

  @Get("accounts")
  async listAccounts(@Req() request: Request) {
    await requireAccount(request, this.prisma, "admin");
    return { accounts: await this.accounts.listAccounts() };
  }

  @Post("accounts")
  async createAccount(@Req() request: Request, @Body() body: CreateAccountDto) {
    await requireAccount(request, this.prisma, "admin");
    try {
      return { account: await this.accounts.createAccount(body) };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Invalid account");
    }
  }

  @Get("project-bindings")
  async listProjectBindings(@Req() request: Request) {
    await requireAccount(request, this.prisma, "admin");
    return { projects: await this.monitor.listProjectBindings() };
  }

  @Post("project-bindings")
  async createProjectBinding(@Req() request: Request, @Body() body: CreateProjectBindingDto) {
    const account = await requireAccount(request, this.prisma, "admin");
    try {
      return {
        project: await this.monitor.createProjectBinding(body, account.id)
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Invalid project");
    }
  }

  @Delete("project-bindings/:projectId")
  async deleteProjectBinding(@Req() request: Request, @Param("projectId") projectId: string) {
    await requireAccount(request, this.prisma, "admin");
    return this.monitor.deleteProjectBinding(projectId);
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
