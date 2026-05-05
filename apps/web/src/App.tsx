import { RefreshCw, TerminalSquare } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DashboardData, SessionStatus } from "@monitor/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { relativeTime } from "@/lib/utils";

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

async function fetchDashboard() {
  const response = await fetch("/api/dashboard", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Dashboard API failed: ${response.status}`);
  }

  return (await response.json()) as DashboardData;
}

export default function App() {
  const [data, setData] = useState<DashboardData>({ devices: [] });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setError(null);
      setData(await fetchDashboard());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Dashboard unavailable");
    } finally {
      setLoading(false);
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
    <main className="mx-auto w-[calc(100%_-_32px)] max-w-[1120px] py-7 max-sm:w-[calc(100%_-_20px)]">
      <header className="mb-5 flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
        <div>
          <p className="mb-1 text-xs font-bold uppercase text-muted">AI Coding Session Monitor</p>
          <h1 className="text-4xl font-black leading-none tracking-normal sm:text-5xl">
            Session Dashboard
          </h1>
        </div>
        <Button onClick={() => void load()} title="重新整理">
          <RefreshCw size={18} />
          Refresh
        </Button>
      </header>

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
          <h2 className="text-2xl font-black">Dashboard API 無法連線</h2>
          <p className="max-w-xl text-muted">{error}</p>
        </Card>
      ) : null}

      {!error && !loading && data.devices.length === 0 ? (
        <Card className="grid min-h-64 place-items-center gap-2 p-7 text-center">
          <TerminalSquare size={34} />
          <h2 className="text-2xl font-black">還沒有 session</h2>
          <p className="max-w-xl text-muted">
            執行 monitor init 和 monitor demo 後，這裡會出現第一張 session card。
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
                              {session.lastInputPreview ?? "尚無 input preview"}
                            </p>
                          </div>
                          <div className="min-h-20 rounded-lg border border-border bg-card p-3">
                            <span className="mb-1 block text-xs font-extrabold text-muted">
                              Output
                            </span>
                            <p className="overflow-wrap-anywhere text-sm leading-relaxed">
                              {session.lastOutputPreview ?? "尚無 output preview"}
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
    </main>
  );
}
