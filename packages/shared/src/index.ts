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

export type DashboardSession = {
  id: string;
  title: string;
  tool: SessionTool;
  status: SessionStatus;
  lastInputPreview?: string;
  lastOutputPreview?: string;
  lastMessageAt?: string;
  updatedAt: string;
};

export type DashboardWorkspace = {
  id: string;
  name: string;
  type: WorkspaceType;
  sessions: DashboardSession[];
};

export type DashboardDevice = {
  id: string;
  name: string;
  platform?: string;
  lastSeenAt: string;
  isOnline: boolean;
  workspaces: DashboardWorkspace[];
};

export type DashboardData = {
  devices: DashboardDevice[];
};
