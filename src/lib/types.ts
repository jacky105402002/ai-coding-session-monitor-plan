export type SessionStatus =
  | "idle"
  | "ai_loading"
  | "waiting_user"
  | "done"
  | "error"
  | "offline";

export type SessionTool = "codex" | "claude" | "aider" | "gemini" | "custom";
export type MessageRole = "user" | "assistant" | "system" | "status";
export type WorkspaceType = "project" | "general";

export type User = {
  id: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
};

export type Device = {
  id: string;
  userId: string;
  name: string;
  platform?: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
};

export type Workspace = {
  id: string;
  userId: string;
  deviceId: string;
  type: WorkspaceType;
  name: string;
  pathHash?: string;
  createdAt: string;
  updatedAt: string;
};

export type Session = {
  id: string;
  userId: string;
  deviceId: string;
  workspaceId: string;
  tool: SessionTool;
  title: string;
  status: SessionStatus;
  lastInputPreview?: string;
  lastOutputPreview?: string;
  lastMessageAt?: string;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type Message = {
  id: string;
  userId: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
};

export type DashboardSession = Pick<
  Session,
  | "id"
  | "title"
  | "tool"
  | "status"
  | "lastInputPreview"
  | "lastOutputPreview"
  | "lastMessageAt"
  | "updatedAt"
>;

export type DashboardWorkspace = Pick<Workspace, "id" | "name" | "type"> & {
  sessions: DashboardSession[];
};

export type DashboardDevice = Pick<Device, "id" | "name" | "platform" | "lastSeenAt"> & {
  isOnline: boolean;
  workspaces: DashboardWorkspace[];
};

export type DashboardData = {
  devices: DashboardDevice[];
};
