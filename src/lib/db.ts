import { Pool, type QueryResult, type QueryResultRow } from "pg";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
    });
  }

  return pool;
}

async function ensureSchema() {
  const db = getPool();
  await db.query(`
    create table if not exists users (
      id text primary key,
      display_name text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists devices (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      name text not null,
      platform text,
      token_hash text not null unique,
      last_seen_at timestamptz not null default now(),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists workspaces (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      device_id text not null references devices(id) on delete cascade,
      type text not null check (type in ('project', 'general')),
      name text not null,
      path_hash text,
      path_hash_key text generated always as (coalesce(path_hash, '')) stored,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (device_id, path_hash_key, name)
    );

    create table if not exists sessions (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      device_id text not null references devices(id) on delete cascade,
      workspace_id text not null references workspaces(id) on delete cascade,
      tool text not null check (tool in ('codex', 'claude', 'aider', 'gemini', 'custom')),
      title text not null,
      status text not null check (status in ('idle', 'ai_loading', 'waiting_user', 'done', 'error', 'offline')),
      last_input_preview text,
      last_output_preview text,
      last_message_at timestamptz,
      started_at timestamptz not null default now(),
      ended_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists messages (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      session_id text not null references sessions(id) on delete cascade,
      role text not null check (role in ('user', 'assistant', 'system', 'status')),
      content text not null,
      created_at timestamptz not null default now()
    );

    create index if not exists idx_devices_user_id on devices(user_id);
    create index if not exists idx_workspaces_device_id on workspaces(device_id);
    create index if not exists idx_sessions_workspace_id on sessions(workspace_id);
    create index if not exists idx_messages_session_id on messages(session_id);
  `);
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  schemaReady ??= ensureSchema();
  await schemaReady;
  return getPool().query<T>(text, params);
}

export function toIso(value: Date | string | null | undefined) {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
