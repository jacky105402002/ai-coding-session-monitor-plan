import { hashToken } from "./auth";
import { query, toIso } from "./db";
import { makeId, makeToken } from "./ids";
import { previewText } from "./text";
import type {
  DashboardData,
  MessageRole,
  SessionStatus,
  SessionTool,
  WorkspaceType
} from "./types";

type RegisterDeviceInput = {
  displayName?: unknown;
  deviceName?: unknown;
  platform?: unknown;
};

type CreateSessionInput = {
  workspace?: {
    type?: unknown;
    name?: unknown;
    pathHash?: unknown;
  };
  tool?: unknown;
  title?: unknown;
};

const validWorkspaceTypes = new Set<WorkspaceType>(["project", "general"]);
const validTools = new Set<SessionTool>(["codex", "claude", "aider", "gemini", "custom"]);
const validStatuses = new Set<SessionStatus>([
  "idle",
  "ai_loading",
  "waiting_user",
  "done",
  "error",
  "offline"
]);
const validRoles = new Set<MessageRole>(["user", "assistant", "system", "status"]);

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export async function registerDevice(input: RegisterDeviceInput) {
  const now = new Date();
  const userId = makeId("usr");
  const deviceId = makeId("dev");
  const deviceToken = makeToken();
  const displayName = stringValue(input.displayName, "Monitor User");
  const deviceName = stringValue(input.deviceName, "Unknown Device");
  const platform = stringValue(input.platform);

  await query(
    `insert into users (id, display_name, created_at, updated_at)
     values ($1, $2, $3, $3)`,
    [userId, displayName, now]
  );

  await query(
    `insert into devices (id, user_id, name, platform, token_hash, last_seen_at, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $6, $6)`,
    [deviceId, userId, deviceName, platform || null, hashToken(deviceToken), now]
  );

  return { userId, deviceId, deviceToken };
}

export async function heartbeat(deviceId: string, authDeviceId: string) {
  if (deviceId !== authDeviceId) {
    return false;
  }

  const result = await query(
    "update devices set last_seen_at = now(), updated_at = now() where id = $1",
    [deviceId]
  );

  return result.rowCount === 1;
}

export async function createSession(
  input: CreateSessionInput,
  authDevice: { id: string; userId: string }
) {
  const workspaceInput = input.workspace ?? {};
  const workspaceType = validWorkspaceTypes.has(workspaceInput.type as WorkspaceType)
    ? (workspaceInput.type as WorkspaceType)
    : "general";
  const workspaceName = stringValue(workspaceInput.name, "General");
  const pathHash = stringValue(workspaceInput.pathHash);
  const tool = validTools.has(input.tool as SessionTool)
    ? (input.tool as SessionTool)
    : "custom";
  const title = stringValue(input.title, "AI Coding Session");
  const workspaceId = makeId("wks");
  const sessionId = makeId("ses");

  const workspaceResult = await query<{ id: string }>(
    `insert into workspaces (id, user_id, device_id, type, name, path_hash, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, now(), now())
     on conflict (device_id, path_hash_key, name) do update
     set type = excluded.type, updated_at = now()
     returning id`,
    [
      workspaceId,
      authDevice.userId,
      authDevice.id,
      workspaceType,
      workspaceName,
      pathHash || null
    ]
  );

  const resolvedWorkspaceId = workspaceResult.rows[0].id;
  const sessionResult = await query<{ id: string }>(
    `insert into sessions (
      id, user_id, device_id, workspace_id, tool, title, status,
      started_at, created_at, updated_at
    )
    values ($1, $2, $3, $4, $5, $6, 'idle', now(), now(), now())
    returning id`,
    [sessionId, authDevice.userId, authDevice.id, resolvedWorkspaceId, tool, title]
  );

  return {
    sessionId: sessionResult.rows[0].id,
    workspaceId: resolvedWorkspaceId
  };
}

export async function updateSessionStatus(
  sessionId: string,
  input: { status?: unknown; lastInputPreview?: unknown; lastOutputPreview?: unknown },
  authDevice: { id: string; userId: string }
) {
  if (!validStatuses.has(input.status as SessionStatus)) {
    return null;
  }

  const status = input.status as SessionStatus;
  const endedAt = status === "done" || status === "error" ? new Date() : null;
  const result = await query<{ id: string }>(
    `update sessions
     set status = $1,
         last_input_preview = coalesce($2, last_input_preview),
         last_output_preview = coalesce($3, last_output_preview),
         last_message_at = now(),
         ended_at = coalesce($4, ended_at),
         updated_at = now()
     where id = $5 and device_id = $6 and user_id = $7
     returning id`,
    [
      status,
      previewText(input.lastInputPreview) ?? null,
      previewText(input.lastOutputPreview) ?? null,
      endedAt,
      sessionId,
      authDevice.id,
      authDevice.userId
    ]
  );

  return result.rows[0] ?? null;
}

export async function createMessage(
  sessionId: string,
  input: { role?: unknown; content?: unknown },
  authDevice: { id: string; userId: string }
) {
  if (!validRoles.has(input.role as MessageRole) || typeof input.content !== "string") {
    return null;
  }

  const session = await query<{ id: string }>(
    "select id from sessions where id = $1 and device_id = $2 and user_id = $3",
    [sessionId, authDevice.id, authDevice.userId]
  );

  if (!session.rows[0]) {
    return null;
  }

  const messageId = makeId("msg");
  await query(
    `insert into messages (id, user_id, session_id, role, content, created_at)
     values ($1, $2, $3, $4, $5, now())`,
    [messageId, authDevice.userId, sessionId, input.role, input.content]
  );

  const previewColumn = input.role === "user" ? "last_input_preview" : "last_output_preview";
  await query(
    `update sessions
     set ${previewColumn} = $1, last_message_at = now(), updated_at = now()
     where id = $2`,
    [previewText(input.content), sessionId]
  );

  return { messageId };
}

export async function getDashboardData(): Promise<DashboardData> {
  const rows = await query<{
    device_id: string;
    device_name: string;
    platform: string | null;
    last_seen_at: Date;
    workspace_id: string | null;
    workspace_name: string | null;
    workspace_type: WorkspaceType | null;
    session_id: string | null;
    title: string | null;
    tool: SessionTool | null;
    status: SessionStatus | null;
    last_input_preview: string | null;
    last_output_preview: string | null;
    last_message_at: Date | null;
    session_updated_at: Date | null;
  }>(`
    select
      d.id as device_id,
      d.name as device_name,
      d.platform,
      d.last_seen_at,
      w.id as workspace_id,
      w.name as workspace_name,
      w.type as workspace_type,
      s.id as session_id,
      s.title,
      s.tool,
      s.status,
      s.last_input_preview,
      s.last_output_preview,
      s.last_message_at,
      s.updated_at as session_updated_at
    from devices d
    left join workspaces w on w.device_id = d.id
    left join sessions s on s.workspace_id = w.id
    order by d.last_seen_at desc, w.updated_at desc, s.updated_at desc
  `);

  const devices = new Map<string, DashboardData["devices"][number]>();

  for (const row of rows.rows) {
    let device = devices.get(row.device_id);
    if (!device) {
      const lastSeenAt = toIso(row.last_seen_at) ?? new Date().toISOString();
      device = {
        id: row.device_id,
        name: row.device_name,
        platform: row.platform ?? undefined,
        lastSeenAt,
        isOnline: Date.now() - new Date(lastSeenAt).getTime() < 60_000,
        workspaces: []
      };
      devices.set(row.device_id, device);
    }

    if (!row.workspace_id || !row.workspace_name || !row.workspace_type) {
      continue;
    }

    let workspace = device.workspaces.find((item) => item.id === row.workspace_id);
    if (!workspace) {
      workspace = {
        id: row.workspace_id,
        name: row.workspace_name,
        type: row.workspace_type,
        sessions: []
      };
      device.workspaces.push(workspace);
    }

    if (!row.session_id || !row.title || !row.tool || !row.status) {
      continue;
    }

    workspace.sessions.push({
      id: row.session_id,
      title: row.title,
      tool: row.tool,
      status: row.status,
      lastInputPreview: row.last_input_preview ?? undefined,
      lastOutputPreview: row.last_output_preview ?? undefined,
      lastMessageAt: toIso(row.last_message_at),
      updatedAt: toIso(row.session_updated_at) ?? new Date().toISOString()
    });
  }

  return { devices: [...devices.values()] };
}
