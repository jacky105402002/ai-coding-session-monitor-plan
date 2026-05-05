import { Copy, LogOut, RefreshCw, Settings, TerminalSquare } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DashboardData, SessionStatus } from "@monitor/shared";

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  async function load() {
    try {
      setRefreshing(true);
      setError(null);
      setData(await api<DashboardData>("/api/dashboard"));
      setLastUpdatedAt(new Date().toISOString());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Dashboard unavailable");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const counts = useMemo(() => {
    const sessions = data.devices.reduce(
      (deviceTotal, device) =>
        deviceTotal +
        device.workspaces.reduce(
          (workspaceTotal, workspace) => workspaceTotal + workspace.sessions.length,
          0
        ),
      0
    );
    const active = data.devices.reduce(
      (deviceTotal, device) =>
        deviceTotal +
        device.workspaces.reduce(
          (workspaceTotal, workspace) =>
            workspaceTotal +
            workspace.sessions.filter((session) =>
              ["ai_loading", "waiting_user", "idle"].includes(session.status)
            ).length,
          0
        ),
      0
    );

    return { sessions, active };
  }, [data]);

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

      <section className="mb-5 grid grid-cols-3 gap-3 max-sm:grid-cols-1" aria-label="summary">
        <Card className="min-h-24 p-4">
          <span className="text-sm font-bold text-muted">Devices</span>
          <strong className="mt-2 block text-4xl leading-none">{data.devices.length}</strong>
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

      {!error && !loading && data.devices.length === 0 ? (
        <Card className="grid min-h-64 place-items-center gap-2 p-7 text-center">
          <TerminalSquare size={34} />
          <h2 className="text-2xl font-black">No sessions yet</h2>
          <p className="max-w-xl text-muted">
            Run monitor init and monitor demo to create the first session card.
          </p>
        </Card>
      ) : null}

      <section className="grid gap-4">
        {data.devices.map((device) => (
          <Card className="p-5" key={device.id}>
            <div className="mb-5 flex items-start justify-between gap-4 max-sm:flex-col">
              <div>
                <h2 className="text-2xl font-black">{device.name}</h2>
                <p className="mt-1 text-sm text-muted">
                  {device.platform ?? "unknown"} · last seen {relativeTime(device.lastSeenAt)}
                </p>
              </div>
              <Badge tone={device.isOnline ? "green" : "neutral"}>
                {device.isOnline ? "online" : "offline"}
              </Badge>
            </div>

            <div className="grid gap-4">
              {device.workspaces.map((workspace) => (
                <section className="border-t border-border pt-4" key={workspace.id}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="text-base font-black">{workspace.name}</h3>
                    <Badge>{workspace.type}</Badge>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
                    {workspace.sessions.map((session) => (
                      <article
                        className="min-h-64 rounded-lg border border-border bg-neutral-50 p-4"
                        key={session.id}
                      >
                        <div className="mb-4 flex items-start justify-between gap-3 max-sm:flex-col">
                          <div>
                            <h4 className="text-base font-black leading-tight">{session.title}</h4>
                            <p className="mt-1 text-sm text-muted">{session.tool}</p>
                          </div>
                          <Badge tone={statusTones[session.status]}>
                            {statusLabels[session.status]}
                          </Badge>
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
                      </article>
                    ))}
                  </div>
                </section>
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
                  <Button
                    onClick={() => void navigator.clipboard.writeText(commandFor(project))}
                  >
                    <Copy size={16} />
                    Copy command
                  </Button>
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
    return <AdminPage account={account} onLogout={() => void logout()} />;
  }

  return <DashboardPage account={account} onLogout={() => void logout()} />;
}
