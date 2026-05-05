import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  DashboardData,
  MessageRole,
  SessionStatus,
  SessionTool,
  WorkspaceType
} from "@monitor/shared";

import type { AuthDevice } from "./auth.js";
import { PrismaService } from "./prisma.service.js";
import { hashToken, makeId, makeToken, previewText, toIso } from "./utils.js";

const workspaceTypes = new Set<WorkspaceType>(["project", "general"]);
const tools = new Set<SessionTool>(["codex", "claude", "aider", "gemini", "custom"]);
const statuses = new Set<SessionStatus>([
  "idle",
  "ai_loading",
  "waiting_user",
  "done",
  "error",
  "offline"
]);
const roles = new Set<MessageRole>(["user", "assistant", "system", "status"]);

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

@Injectable()
export class MonitorService {
  constructor(private readonly prisma: PrismaService) {}

  async registerDevice(input: {
    displayName?: unknown;
    deviceName?: unknown;
    platform?: unknown;
  }) {
    const userId = makeId("usr");
    const deviceId = makeId("dev");
    const deviceToken = makeToken();
    const displayName = stringValue(input.displayName, "Monitor User");
    const deviceName = stringValue(input.deviceName, "Unknown Device");
    const platform = stringValue(input.platform);

    await this.prisma.user.create({
      data: {
        id: userId,
        displayName,
        devices: {
          create: {
            id: deviceId,
            name: deviceName,
            platform: platform || null,
            tokenHash: hashToken(deviceToken)
          }
        }
      }
    });

    return { userId, deviceId, deviceToken };
  }

  async heartbeat(deviceId: string, authDevice: AuthDevice) {
    if (deviceId !== authDevice.id) {
      throw new NotFoundException("Device not found");
    }

    await this.prisma.device.update({
      where: { id: authDevice.id },
      data: { lastSeenAt: new Date() }
    });

    return { ok: true };
  }

  async createSession(
    input: {
      workspace?: { type?: unknown; name?: unknown; pathHash?: unknown };
      tool?: unknown;
      title?: unknown;
    },
    authDevice: AuthDevice
  ) {
    const workspaceInput = input.workspace ?? {};
    const workspaceType = workspaceTypes.has(workspaceInput.type as WorkspaceType)
      ? (workspaceInput.type as WorkspaceType)
      : "general";
    const workspaceName = stringValue(workspaceInput.name, "General");
    const pathHash = stringValue(workspaceInput.pathHash);
    const tool = tools.has(input.tool as SessionTool) ? (input.tool as SessionTool) : "custom";
    const title = stringValue(input.title, "AI Coding Session");

    const workspace =
      (await this.prisma.workspace.findFirst({
        where: {
          deviceId: authDevice.id,
          name: workspaceName,
          pathHash: pathHash || null
        },
        select: { id: true }
      })) ??
      (await this.prisma.workspace.create({
        data: {
          id: makeId("wks"),
          userId: authDevice.userId,
          deviceId: authDevice.id,
          type: workspaceType,
          name: workspaceName,
          pathHash: pathHash || null
        },
        select: { id: true }
      }));

    const session = await this.prisma.session.create({
      data: {
        id: makeId("ses"),
        userId: authDevice.userId,
        deviceId: authDevice.id,
        workspaceId: workspace.id,
        tool,
        title,
        status: "idle"
      },
      select: { id: true }
    });

    return {
      sessionId: session.id,
      workspaceId: workspace.id
    };
  }

  async updateSessionStatus(
    sessionId: string,
    input: { status?: unknown; lastInputPreview?: unknown; lastOutputPreview?: unknown },
    authDevice: AuthDevice
  ) {
    if (!statuses.has(input.status as SessionStatus)) {
      throw new NotFoundException("Session not found or invalid status");
    }

    const status = input.status as SessionStatus;
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, deviceId: authDevice.id, userId: authDevice.userId },
      select: { id: true }
    });

    if (!session) {
      throw new NotFoundException("Session not found or invalid status");
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status,
        lastInputPreview: previewText(input.lastInputPreview),
        lastOutputPreview: previewText(input.lastOutputPreview),
        lastMessageAt: new Date(),
        endedAt: status === "done" || status === "error" ? new Date() : undefined
      }
    });

    return { ok: true };
  }

  async createMessage(
    sessionId: string,
    input: { role?: unknown; content?: unknown },
    authDevice: AuthDevice
  ) {
    if (!roles.has(input.role as MessageRole) || typeof input.content !== "string") {
      throw new NotFoundException("Session not found or invalid message");
    }

    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, deviceId: authDevice.id, userId: authDevice.userId },
      select: { id: true }
    });

    if (!session) {
      throw new NotFoundException("Session not found or invalid message");
    }

    const message = await this.prisma.message.create({
      data: {
        id: makeId("msg"),
        userId: authDevice.userId,
        sessionId,
        role: input.role as MessageRole,
        content: input.content
      },
      select: { id: true }
    });

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        lastInputPreview:
          input.role === "user" ? previewText(input.content) : undefined,
        lastOutputPreview:
          input.role === "user" ? undefined : previewText(input.content),
        lastMessageAt: new Date()
      }
    });

    return { messageId: message.id };
  }

  async getDashboardData(): Promise<DashboardData> {
    const devices = await this.prisma.device.findMany({
      orderBy: { lastSeenAt: "desc" },
      include: {
        workspaces: {
          orderBy: { updatedAt: "desc" },
          include: {
            sessions: {
              orderBy: { updatedAt: "desc" }
            }
          }
        }
      }
    });

    return {
      devices: devices.map((device) => {
        const lastSeenAt = toIso(device.lastSeenAt) ?? new Date().toISOString();

        return {
          id: device.id,
          name: device.name,
          platform: device.platform ?? undefined,
          lastSeenAt,
          isOnline: Date.now() - new Date(lastSeenAt).getTime() < 60_000,
          workspaces: device.workspaces.map((workspace) => ({
            id: workspace.id,
            name: workspace.name,
            type: workspace.type as WorkspaceType,
            sessions: workspace.sessions.map((session) => ({
              id: session.id,
              title: session.title,
              tool: session.tool as SessionTool,
              status: session.status as SessionStatus,
              lastInputPreview: session.lastInputPreview ?? undefined,
              lastOutputPreview: session.lastOutputPreview ?? undefined,
              lastMessageAt: toIso(session.lastMessageAt),
              updatedAt: toIso(session.updatedAt) ?? new Date().toISOString()
            }))
          }))
        };
      })
    };
  }
}
