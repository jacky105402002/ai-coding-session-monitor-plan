import type { SessionStatus } from "@/lib/types";

const labels: Record<SessionStatus, string> = {
  idle: "Idle",
  ai_loading: "AI Loading",
  waiting_user: "Waiting User",
  done: "Done",
  error: "Error",
  offline: "Offline"
};

export function StatusBadge({ status }: { status: SessionStatus }) {
  return <span className={`statusBadge status-${status}`}>{labels[status]}</span>;
}
