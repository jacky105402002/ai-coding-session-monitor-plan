import { RefreshCw, Server, TerminalSquare } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { getDashboardData } from "@/lib/store";
import type { DashboardData } from "@/lib/types";

export const dynamic = "force-dynamic";

function relativeTime(value?: string) {
  if (!value) {
    return "尚無紀錄";
  }

  const diffSeconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (diffSeconds < 60) {
    return `${diffSeconds} 秒前`;
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} 分鐘前`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} 小時前`;
  }

  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

async function loadDashboard(): Promise<{ data: DashboardData; error?: string }> {
  try {
    return { data: await getDashboardData() };
  } catch (error) {
    return {
      data: { devices: [] },
      error: error instanceof Error ? error.message : "Dashboard data unavailable"
    };
  }
}

export default async function DashboardPage() {
  const { data, error } = await loadDashboard();
  const sessionCount = data.devices.reduce(
    (total, device) =>
      total +
      device.workspaces.reduce((workspaceTotal, workspace) => workspaceTotal + workspace.sessions.length, 0),
    0
  );
  const activeCount = data.devices.reduce(
    (total, device) =>
      total +
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

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">AI Coding Session Monitor</p>
          <h1>Session Dashboard</h1>
        </div>
        <a className="refreshButton" href="/" title="重新整理">
          <RefreshCw size={18} />
          <span>Refresh</span>
        </a>
      </header>

      <section className="statsGrid" aria-label="dashboard summary">
        <div className="statTile">
          <span>Devices</span>
          <strong>{data.devices.length}</strong>
        </div>
        <div className="statTile">
          <span>Sessions</span>
          <strong>{sessionCount}</strong>
        </div>
        <div className="statTile">
          <span>Active</span>
          <strong>{activeCount}</strong>
        </div>
      </section>

      {error ? (
        <section className="emptyState">
          <Server size={34} />
          <h2>資料庫尚未連線</h2>
          <p>請在 Zeabur 服務環境變數設定 DATABASE_URL，部署後重新整理即可。</p>
        </section>
      ) : null}

      {!error && data.devices.length === 0 ? (
        <section className="emptyState">
          <TerminalSquare size={34} />
          <h2>還沒有 session</h2>
          <p>執行 monitor init 和 monitor demo 後，這裡會出現第一張 session card。</p>
        </section>
      ) : null}

      <section className="deviceStack">
        {data.devices.map((device) => (
          <article className="devicePanel" key={device.id}>
            <div className="deviceHeader">
              <div>
                <h2>{device.name}</h2>
                <p>{device.platform ?? "unknown"} · last seen {relativeTime(device.lastSeenAt)}</p>
              </div>
              <span className={device.isOnline ? "onlinePill" : "offlinePill"}>
                {device.isOnline ? "online" : "offline"}
              </span>
            </div>

            <div className="workspaceStack">
              {device.workspaces.map((workspace) => (
                <section className="workspaceBlock" key={workspace.id}>
                  <div className="workspaceHeader">
                    <h3>{workspace.name}</h3>
                    <span>{workspace.type}</span>
                  </div>

                  <div className="sessionGrid">
                    {workspace.sessions.map((session) => (
                      <article className="sessionCard" key={session.id}>
                        <div className="sessionCardHeader">
                          <div>
                            <h4>{session.title}</h4>
                            <p>{session.tool}</p>
                          </div>
                          <StatusBadge status={session.status} />
                        </div>
                        <div className="previewGroup">
                          <div>
                            <span>Input</span>
                            <p>{session.lastInputPreview ?? "尚無 input preview"}</p>
                          </div>
                          <div>
                            <span>Output</span>
                            <p>{session.lastOutputPreview ?? "尚無 output preview"}</p>
                          </div>
                        </div>
                        <footer>updated {relativeTime(session.lastMessageAt ?? session.updatedAt)}</footer>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
