export const schemaStatements = [
  `create table if not exists users (
    id text primary key,
    display_name text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,

  `create table if not exists devices (
    id text primary key,
    user_id text not null references users(id) on delete cascade,
    name text not null,
    platform text,
    token_hash text not null unique,
    last_seen_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,

  `create table if not exists workspaces (
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
  )`,

  `create table if not exists sessions (
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
  )`,

  `create table if not exists messages (
    id text primary key,
    user_id text not null references users(id) on delete cascade,
    session_id text not null references sessions(id) on delete cascade,
    role text not null check (role in ('user', 'assistant', 'system', 'status')),
    content text not null,
    created_at timestamptz not null default now()
  )`,

  `create index if not exists idx_devices_user_id on devices(user_id)`,
  `create index if not exists idx_workspaces_device_id on workspaces(device_id)`,
  `create index if not exists idx_sessions_workspace_id on sessions(workspace_id)`,
  `create index if not exists idx_messages_session_id on messages(session_id)`
];
