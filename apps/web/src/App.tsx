import { Copy, LogOut, Plus, RefreshCw, Settings, TerminalSquare, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DashboardData, DashboardSession, SessionStatus } from "@monitor/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { relativeTime } from "@/lib/utils";

type Account = {
  id: string;
  username: string;
  role: "admin" | "user";
  displayName?: string | null;
};

type ProjectBinding = {
  id: string;
  projectId: string;
  name: string;
  workspaceName: string;
  description?: string | null;
};

type SessionMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "status";
  content: string;
  createdAt: string;
};

const statusLabels: Record<SessionStatus, string> = {
  idle: "Idle",
  ai_loading: "AI Loading",
  waiting_user: "Waiting User",
  done: "Done",
  error: "Error",
  offline: "Offline"
};

const statusTones: Record<SessionStatus, "neutral" | "green" | "blue" | "amber" | "red"> = {
  idle: "neutral",
  ai_loading: "blue",
  waiting_user: "amber",
  done: "green",
  error: "red",
  offline: "neutral"
};

function latestByUpdatedAt(sessions: DashboardSession[]) {
  return [...sessions].sort(
    (first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
  )[0];
}

function latestWithPreview(
  sessions: DashboardSession[],
  previewKey: "lastInputPreview" | "lastOutputPreview"
) {
  return [...sessions]
    .filter((session) => Boolean(session[previewKey]))
    .sort(
      (first, second) =>
        new Date(second.lastMessageAt ?? second.updatedAt).getTime() -
        new Date(first.lastMessageAt ?? first.updatedAt).getTime()
    )[0];
}

function projectSummaryFor(sessions: DashboardSession[]) {
  const latestSession = latestByUpdatedAt(sessions);
  const latestInputSession = latestWithPreview(sessions, "lastInputPreview");
  const latestOutputSession = latestWithPreview(sessions, "lastOutputPreview");
  const latestErrorSession = latestByUpdatedAt(
    sessions.filter((session) => session.status === "error")
  );
  const needsUserControl = sessions.some((session) =>
    ["idle", "waiting_user"].includes(session.status)
  );
  const activeSession = latestByUpdatedAt(
    sessions.filter((session) => session.status === "ai_loading")
  );

  if (latestSession?.status === "error") {
    return {
      label: "Needs Attention",
      tone: "red" as const,
      hint: "Latest session ended with an error.",
      latestSession,
      latestInputSession,
      latestOutputSession,
      latestErrorSession,
      needsUserControl,
      activeSession
    };
  }

  if (latestSession?.status === "ai_loading") {
    return {
      label: "AI Running",
      tone: "blue" as const,
      hint: "Latest session is currently running.",
      latestSession,
      latestInputSession,
      latestOutputSession,
      latestErrorSession,
      needsUserControl,
      activeSession
    };
  }

  if (latestSession && ["idle", "waiting_user"].includes(latestSession.status)) {
    return {
      label: "Needs User",
      tone: "amber" as const,
      hint: "Latest session is waiting for user input or review.",
      latestSession,
      latestInputSession,
      latestOutputSession,
      latestErrorSession,
      needsUserControl,
      activeSession
    };
  }

  return {
    label: sessions.length > 0 ? "Healthy" : "No Sessions",
    tone: sessions.length > 0 ? ("green" as const) : ("neutral" as const),
    hint: sessions.length > 0 ? "Latest sessions finished cleanly." : "Waiting for monitor data.",
    latestSession,
    latestInputSession,
    latestOutputSession,
    latestErrorSession,
    needsUserControl,
    activeSession
  };
}

async function api<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {})
    }
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message || body.error || `${response.status} ${response.statusText}`);
  }

  return body as T;
}

function Shell({
  account,
  children,
  onLogout
}: {
  account: Account;
  children: React.ReactNode;
  onLogout: () => void;
}) {
  return (
    <main className="mx-auto w-[calc(100%_-_32px)] max-w-[1120px] py-7 max-sm:w-[calc(100%_-_20px)]">
      <header className="mb-5 flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
        <div>
          <p className="mb-1 text-xs font-bold uppercase text-muted">AI Coding Session Monitor</p>
          <h1 className="text-4xl font-black leading-none tracking-normal sm:text-5xl">
            Session Dashboard
          </h1>
          <p className="mt-2 text-sm text-muted">
            Signed in as {account.displayName || account.username}
          </p>
        </div>
        <div className="flex gap-2 max-sm:grid max-sm:grid-cols-2">
          {account.role === "admin" ? (
            <a href="/admin">
              <Button title="Admin">
                <Settings size={18} />
                Admin
              </Button>
            </a>
          ) : null}
          <Button onClick={onLogout} title="Logout">
            <LogOut size={18} />
            Logout
          </Button>
        </div>
      </header>
      {children}
    </main>
  );
}

function LoginPage({ onLogin }: { onLogin: (account: Account) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      setError(null);
      const result = await api<{ account: Account }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      onLogin(result.account);
      window.history.replaceState(null, "", "/");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed");
    }
  }

  return (
    <main className="mx-auto grid min-h-screen w-[calc(100%_-_32px)] max-w-md place-items-center py-8">
      <Card className="w-full p-6">
        <p className="mb-2 text-xs font-bold uppercase text-muted">AI Coding Session Monitor</p>
        <h1 className="mb-6 text-3xl font-black">Sign in</h1>
        <form className="grid gap-4" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-bold">
            Account
            <input
              className="h-11 rounded-md border border-border bg-card px-3 font-normal outline-none focus:border-foreground"
              onChange={(event) => setUsername(event.target.value)}
              value={username}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Password
            <input
              className="h-11 rounded-md border border-border bg-card px-3 font-normal outline-none focus:border-foreground"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>
          {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
          <Button className="w-full" type="submit">
            Login
          </Button>
        </form>
      </Card>
    </main>
  );
}

function DashboardPage({ account, onLogout }: { account: Account; onLogout: () => void }) {
  const [data, setData] = useState<DashboardData>({ devices: [] });
  const [projects, setProjects] = useState<ProjectBinding[]>([]);
  const [visibleProjectIds, setVisibleProjectIds] = useState<string[]>(() => {
    const rawValue = window.localStorage.getItem("visibleProjectIds");
    if (!rawValue) {
      return [];
    }

    try {
      const parsedValue = JSON.parse(rawValue);
      return Array.isArray(parsedValue) ? parsedValue.filter((item) => typeof item === "string") : [];
    } catch {
      return [];
    }
  });
  const [projectToAdd, setProjectToAdd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [expandedSessionIds, setExpandedSessionIds] = useState<string[]>([]);
  const [messagesBySessionId, setMessagesBySessionId] = useState<
    Record<string, SessionMessage[]>
  >({});
  const [messageLoadingSessionId, setMessageLoadingSessionId] = useState<string | null>(null);
  const [messageErrorBySessionId, setMessageErrorBySessionId] = useState<Record<string, string>>(
    {}
  );
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  function saveVisibleProjects(nextIds: string[]) {
    setVisibleProjectIds(nextIds);
    window.localStorage.setItem("visibleProjectIds", JSON.stringify(nextIds));
  }

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      const [dashboardResult, projectResult] = await Promise.all([
        api<DashboardData>("/api/dashboard"),
        api<{ projects: ProjectBinding[] }>("/api/projects")
      ]);
      setData(dashboardResult);
      setProjects(projectResult.projects);

      setLastUpdatedAt(new Date().toISOString());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Dashboard unavailable");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  const projectLookup = useMemo(
    () => new Map(projects.map((project) => [project.projectId, project])),
    [projects]
  );
  const visibleProjects = useMemo(
    () =>
      visibleProjectIds
        .map((projectId) => projectLookup.get(projectId))
        .filter((project): project is ProjectBinding => Boolean(project)),
    [projectLookup, visibleProjectIds]
  );
  const projectViews = useMemo(
    () =>
      visibleProjects.map((project) => {
        const devices = data.devices
          .map((device) => ({
            ...device,
            workspaces: device.workspaces.filter(
              (workspace) => workspace.name === project.projectId
            )
          }))
          .filter((device) => device.workspaces.length > 0);
        const sessions = devices.flatMap((device) =>
          device.workspaces.flatMap((workspace) => workspace.sessions)
        );
        const active = sessions.filter((session) =>
          ["ai_loading", "waiting_user", "idle"].includes(session.status)
        ).length;
        const summary = projectSummaryFor(sessions);

        return { project, devices, sessions, active, summary };
      }),
    [data.devices, visibleProjects]
  );

  const counts = useMemo(() => {
    const sessions = projectViews.reduce(
      (total, projectView) => total + projectView.sessions.length,
      0
    );
    const active = projectViews.reduce(
      (total, projectView) => total + projectView.active,
      0
    );

    return { sessions, active };
  }, [projectViews]);

  const sessionGridClass =
    visibleProjects.length <= 1
      ? "grid grid-cols-1 gap-3"
      : visibleProjects.length === 2
        ? "grid grid-cols-2 gap-3 max-lg:grid-cols-1"
        : "grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3";

  function addVisibleProject() {
    if (!projectToAdd || visibleProjectIds.includes(projectToAdd)) {
      return;
    }
    saveVisibleProjects([...visibleProjectIds, projectToAdd]);
    setProjectToAdd("");
  }

  function hideVisibleProject(projectId: string) {
    saveVisibleProjects(visibleProjectIds.filter((item) => item !== projectId));
  }

  async function toggleSessionMessages(sessionId: string) {
    if (expandedSessionIds.includes(sessionId)) {
      setExpandedSessionIds(expandedSessionIds.filter((item) => item !== sessionId));
      return;
    }

    setExpandedSessionIds([...expandedSessionIds, sessionId]);

    if (messagesBySessionId[sessionId]) {
      return;
    }

    try {
      setMessageLoadingSessionId(sessionId);
      setMessageErrorBySessionId((current) => ({ ...current, [sessionId]: "" }));
      const result = await api<{ messages: SessionMessage[] }>(
        `/api/sessions/${encodeURIComponent(sessionId)}/messages`
      );
      setMessagesBySessionId((current) => ({
        ...current,
        [sessionId]: result.messages
      }));
    } catch (loadError) {
      setMessageErrorBySessionId((current) => ({
        ...current,
        [sessionId]: loadError instanceof Error ? loadError.message : "Messages unavailable"
      }));
    } finally {
      setMessageLoadingSessionId(null);
    }
  }

  async function deleteSession(sessionId: string, title: string) {
    const confirmed = window.confirm(`Delete session "${title}"?`);
    if (!confirmed) {
      return;
    }

    try {
      setDeletingSessionId(sessionId);
      setError(null);
      await api(`/api/sessions/${encodeURIComponent(sessionId)}`, {
        method: "DELETE"
      });
      setExpandedSessionIds((current) => current.filter((item) => item !== sessionId));
      setMessagesBySessionId((current) => {
        const next = { ...current };
        delete next[sessionId];
        return next;
      });
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete session failed");
    } finally {
      setDeletingSessionId(null);
    }
  }

  return (
    <Shell account={account} onLogout={onLogout}>
      <div className="mb-5 flex items-center justify-end gap-3">
        {lastUpdatedAt ? (
          <span className="text-sm font-bold text-muted">
            Updated {relativeTime(lastUpdatedAt)}
          </span>
        ) : null}
        <Button disabled={refreshing} onClick={() => void load()} title="Refresh">
          <RefreshCw className={refreshing ? "animate-spin" : ""} size={18} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <Card className="mb-5 p-4">
        <div className="mb-3 flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
          <div>
            <h2 className="text-lg font-black">Visible Projects</h2>
            <p className="text-sm text-muted">
              Admin controls connected projects. This dashboard controls what is shown.
            </p>
          </div>
          <div className="flex gap-2 max-sm:grid max-sm:grid-cols-[1fr_auto]">
            <select
              className="h-10 min-w-56 rounded-md border border-border bg-card px-3"
              onChange={(event) => setProjectToAdd(event.target.value)}
              value={projectToAdd}
            >
              <option value="">Add connected project</option>
              {projects
                .filter((project) => !visibleProjectIds.includes(project.projectId))
                .map((project) => (
                  <option key={project.projectId} value={project.projectId}>
                    {project.name} ({project.projectId})
                  </option>
                ))}
            </select>
            <Button disabled={!projectToAdd} onClick={addVisibleProject}>
              <Plus size={16} />
              Add
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleProjects.length === 0 ? (
            <p className="text-sm font-bold text-muted">
              No project selected. Add a connected project to show it here.
            </p>
          ) : null}
          {visibleProjects.map((project) => (
            <span
              className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-2 text-sm font-bold"
              key={project.projectId}
            >
              {project.name}
              <button
                className="inline-flex size-6 items-center justify-center rounded-full hover:bg-neutral-200"
                onClick={() => hideVisibleProject(project.projectId)}
                title="Hide project"
                type="button"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      </Card>

      <section className="mb-5 grid grid-cols-3 gap-3 max-sm:grid-cols-1" aria-label="summary">
        <Card className="min-h-24 p-4">
          <span className="text-sm font-bold text-muted">Visible Projects</span>
          <strong className="mt-2 block text-4xl leading-none">{visibleProjects.length}</strong>
        </Card>
        <Card className="min-h-24 p-4">
          <span className="text-sm font-bold text-muted">Sessions</span>
          <strong className="mt-2 block text-4xl leading-none">{counts.sessions}</strong>
        </Card>
        <Card className="min-h-24 p-4">
          <span className="text-sm font-bold text-muted">Active</span>
          <strong className="mt-2 block text-4xl leading-none">{counts.active}</strong>
        </Card>
      </section>

      {error ? (
        <Card className="grid min-h-64 place-items-center gap-2 p-7 text-center">
          <TerminalSquare size={34} />
          <h2 className="text-2xl font-black">Dashboard API unavailable</h2>
          <p className="max-w-xl text-muted">{error}</p>
        </Card>
      ) : null}

      {!error && !loading && projectViews.length === 0 ? (
        <Card className="grid min-h-64 place-items-center gap-2 p-7 text-center">
          <TerminalSquare size={34} />
          <h2 className="text-2xl font-black">No visible projects</h2>
          <p className="max-w-xl text-muted">
            Add a connected project above. Admin decides what can be connected; this page decides
            what is displayed.
          </p>
        </Card>
      ) : null}

      <section className="grid gap-4">
        {projectViews.map((projectView) => (
          <Card className="p-5" key={projectView.project.projectId}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-black">{projectView.project.name}</h3>
                <p className="mt-1 text-sm text-muted">{projectView.project.projectId}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={projectView.summary.tone}>{projectView.summary.label}</Badge>
                <button
                  className="inline-flex size-9 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200"
                  onClick={() => hideVisibleProject(projectView.project.projectId)}
                  title="Hide project"
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
              <div className="rounded-lg border border-border bg-neutral-50 p-3">
                <span className="mb-1 block text-xs font-extrabold text-muted">
                  Project State
                </span>
                <strong className="block text-base">{projectView.summary.label}</strong>
                <p className="mt-1 text-sm text-muted">{projectView.summary.hint}</p>
              </div>
              <div className="rounded-lg border border-border bg-neutral-50 p-3">
                <span className="mb-1 block text-xs font-extrabold text-muted">
                  Latest Question
                </span>
                <p className="overflow-wrap-anywhere text-sm leading-relaxed">
                  {projectView.summary.latestInputSession?.lastInputPreview ?? "No question yet"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-neutral-50 p-3">
                <span className="mb-1 block text-xs font-extrabold text-muted">
                  Latest AI Reply
                </span>
                <p className="overflow-wrap-anywhere text-sm leading-relaxed">
                  {projectView.summary.latestOutputSession?.lastOutputPreview ?? "No reply yet"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-neutral-50 p-3">
                <span className="mb-1 block text-xs font-extrabold text-muted">
                  Latest Error
                </span>
                <p className="overflow-wrap-anywhere text-sm leading-relaxed">
                  {projectView.summary.latestErrorSession?.lastOutputPreview ?? "No error"}
                </p>
              </div>
            </div>

            {projectView.devices.length === 0 ? (
              <div className="grid min-h-40 place-items-center rounded-lg border border-border bg-neutral-50 p-5 text-center">
                <div>
                  <TerminalSquare className="mx-auto mb-3" size={30} />
                  <h4 className="text-lg font-black">Waiting for monitor data</h4>
                  <p className="mt-2 max-w-xl text-sm text-muted">
                    Run the copied command for this project. New Codex sessions will appear here.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4">
              {projectView.devices.map((device) => (
                <div className="grid gap-3" key={device.id}>
                  <div className="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-start">
                    <h4 className="text-lg font-black">{device.name}</h4>
                    <Badge tone={device.isOnline ? "green" : "neutral"}>
                      {device.isOnline ? "online" : "offline"}
                    </Badge>
                  </div>
                  {device.workspaces.map((workspace) => (
                    <div className={sessionGridClass} key={workspace.id}>
                      {workspace.sessions.map((session) => (
                        <article
                          className="min-h-64 rounded-lg border border-border bg-neutral-50 p-4"
                          key={session.id}
                        >
                          <div className="mb-4 flex items-start justify-between gap-3 max-sm:flex-col">
                            <div>
                              <h4 className="text-base font-black leading-tight">
                                {session.title}
                              </h4>
                              <p className="mt-1 text-sm text-muted">{session.tool}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge tone={statusTones[session.status]}>
                                {statusLabels[session.status]}
                              </Badge>
                              <button
                                className="inline-flex size-8 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 disabled:opacity-60"
                                disabled={deletingSessionId === session.id}
                                onClick={() => void deleteSession(session.id, session.title)}
                                title="Delete session"
                                type="button"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                          <div className="grid gap-3">
                            <div className="min-h-20 rounded-lg border border-border bg-card p-3">
                              <span className="mb-1 block text-xs font-extrabold text-muted">
                                Input
                              </span>
                              <p className="overflow-wrap-anywhere text-sm leading-relaxed">
                                {session.lastInputPreview ?? "No input preview yet"}
                              </p>
                            </div>
                            <div className="min-h-20 rounded-lg border border-border bg-card p-3">
                              <span className="mb-1 block text-xs font-extrabold text-muted">
                                Output
                              </span>
                              <p className="overflow-wrap-anywhere text-sm leading-relaxed">
                                {session.lastOutputPreview ?? "No output preview yet"}
                              </p>
                            </div>
                          </div>
                          <footer className="mt-3 text-sm text-muted">
                            updated {relativeTime(session.lastMessageAt ?? session.updatedAt)}
                          </footer>
                          <div className="mt-3 border-t border-border pt-3">
                            <Button
                              className="w-full justify-center"
                              onClick={() => void toggleSessionMessages(session.id)}
                            >
                              {expandedSessionIds.includes(session.id) ? "Hide" : "Show"} Messages
                            </Button>
                            {expandedSessionIds.includes(session.id) ? (
                              <div className="mt-3 grid gap-2">
                                {messageLoadingSessionId === session.id ? (
                                  <p className="text-sm font-bold text-muted">
                                    Loading messages...
                                  </p>
                                ) : null}
                                {messageErrorBySessionId[session.id] ? (
                                  <p className="text-sm font-bold text-red-700">
                                    {messageErrorBySessionId[session.id]}
                                  </p>
                                ) : null}
                                {messagesBySessionId[session.id]?.length === 0 ? (
                                  <p className="text-sm font-bold text-muted">
                                    No messages stored for this session yet.
                                  </p>
                                ) : null}
                                {messagesBySessionId[session.id]?.map((message) => (
                                  <div
                                    className="rounded-lg border border-border bg-card p-3"
                                    key={message.id}
                                  >
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                      <Badge
                                        tone={
                                          message.role === "assistant"
                                            ? "blue"
                                            : message.role === "user"
                                              ? "amber"
                                              : "neutral"
                                        }
                                      >
                                        {message.role}
                                      </Badge>
                                      <span className="text-xs font-bold text-muted">
                                        {relativeTime(message.createdAt)}
                                      </span>
                                    </div>
                                    <p className="whitespace-pre-wrap overflow-wrap-anywhere text-sm leading-relaxed">
                                      {message.content}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </section>
    </Shell>
  );
}

function AdminPage({ account, onLogout }: { account: Account; onLogout: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [projects, setProjects] = useState<ProjectBinding[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  async function load() {
    try {
      setAdminError(null);
      const [accountResult, projectResult] = await Promise.all([
        api<{ accounts: Account[] }>("/api/admin/accounts"),
        api<{ projects: ProjectBinding[] }>("/api/admin/project-bindings")
      ]);
      setAccounts(accountResult.accounts);
      setProjects(projectResult.projects);
    } catch (loadError) {
      setAdminError(loadError instanceof Error ? loadError.message : "Admin API unavailable");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      setCreatingAccount(true);
      setAdminError(null);
      setMessage(null);
      await api("/api/admin/accounts", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form.entries()))
      });
      formElement.reset();
      setMessage("Account created.");
      await load();
    } catch (createError) {
      setAdminError(createError instanceof Error ? createError.message : "Create account failed");
    } finally {
      setCreatingAccount(false);
    }
  }

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      setCreatingProject(true);
      setAdminError(null);
      setMessage(null);
      await api("/api/admin/project-bindings", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form.entries()))
      });
      formElement.reset();
      setMessage("Project binding created.");
      await load();
    } catch (createError) {
      setAdminError(
        createError instanceof Error ? createError.message : "Create project binding failed"
      );
    } finally {
      setCreatingProject(false);
    }
  }

  async function deleteProject(projectId: string) {
    const confirmed = window.confirm(`Delete project binding "${projectId}"?`);
    if (!confirmed) {
      return;
    }

    try {
      setDeletingProjectId(projectId);
      setAdminError(null);
      setMessage(null);
      await api(`/api/admin/project-bindings/${encodeURIComponent(projectId)}`, {
        method: "DELETE"
      });
      setMessage("Project binding deleted.");
      await load();
    } catch (deleteError) {
      setAdminError(
        deleteError instanceof Error ? deleteError.message : "Delete project binding failed"
      );
    } finally {
      setDeletingProjectId(null);
    }
  }

  function commandFor(project: ProjectBinding) {
    return `node D:\\code\\codex\\ai-coding-session-monitor-plan\\cli\\monitor.mjs start --workspace ${project.projectId} --title "New session"`;
  }

  return (
    <Shell account={account} onLogout={onLogout}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <a className="text-sm font-bold underline" href="/">
          Back to dashboard
        </a>
        <div className="text-right">
          {message ? <p className="text-sm font-bold text-emerald-700">{message}</p> : null}
          {adminError ? <p className="text-sm font-bold text-red-700">{adminError}</p> : null}
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-xl font-black">Frontend Accounts</h2>
          <form className="mb-5 grid gap-3" onSubmit={createAccount}>
            <input className="h-10 rounded-md border border-border px-3" name="username" placeholder="username" />
            <input className="h-10 rounded-md border border-border px-3" name="password" placeholder="password" type="password" />
            <select className="h-10 rounded-md border border-border px-3" name="role" defaultValue="user">
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            <Button disabled={creatingAccount} type="submit">
              {creatingAccount ? "Creating..." : "Create Account"}
            </Button>
          </form>
          <div className="grid gap-2">
            {accounts.map((item) => (
              <div className="rounded-md border border-border p-3" key={item.id}>
                <strong>{item.username}</strong>
                <p className="text-sm text-muted">{item.role}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-xl font-black">Project Bindings</h2>
          <form className="mb-5 grid gap-3" onSubmit={createProject}>
            <input className="h-10 rounded-md border border-border px-3" name="projectId" placeholder="project id, e.g. customer-api" />
            <input className="h-10 rounded-md border border-border px-3" name="name" placeholder="display name" />
            <input className="h-10 rounded-md border border-border px-3" name="description" placeholder="description" />
            <Button disabled={creatingProject} type="submit">
              {creatingProject ? "Creating..." : "Create Project Binding"}
            </Button>
          </form>
          <div className="grid gap-3">
            {projects.map((project) => (
              <div className="rounded-md border border-border p-3" key={project.id}>
                <strong>{project.name}</strong>
                <p className="text-sm text-muted">{project.projectId}</p>
                <div className="mt-3 grid gap-2 rounded-md bg-neutral-100 p-3 text-sm">
                  <code className="break-all">{commandFor(project)}</code>
                  <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
                    <Button
                      onClick={() => void navigator.clipboard.writeText(commandFor(project))}
                    >
                      <Copy size={16} />
                      Copy command
                    </Button>
                    <Button
                      disabled={deletingProjectId === project.projectId}
                      onClick={() => void deleteProject(project.projectId)}
                    >
                      {deletingProjectId === project.projectId ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </Shell>
  );
}

export default function App() {
  const [account, setAccount] = useState<Account | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api<{ account: Account }>("/api/auth/me")
      .then((result) => setAccount(result.account))
      .catch(() => setAccount(null))
      .finally(() => setChecking(false));
  }, []);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setAccount(null);
    window.history.replaceState(null, "", "/login");
  }

  if (checking) {
    return <main className="p-8 text-sm font-bold text-muted">Loading...</main>;
  }

  if (!account) {
    return <LoginPage onLogin={setAccount} />;
  }

  if (window.location.pathname === "/admin") {
    if (account.role !== "admin") {
      window.history.replaceState(null, "", "/");
      return <DashboardPage account={account} onLogout={() => void logout()} />;
    }

    return <AdminPage account={account} onLogout={() => void logout()} />;
  }

  return <DashboardPage account={account} onLogout={() => void logout()} />;
}
