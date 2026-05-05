# Development Spec

This project is the POC/MVP for AI Coding Session Monitor.

## Stack

Frontend:

- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui-style local components

Backend:

- NestJS
- TypeScript
- Swagger
- Prisma

Data and deployment:

- PostgreSQL
- Zeabur for MVP, POC, personal projects, and early deployments

## Project Structure

```text
.
├─ apps/
│  ├─ web/                 # React + Vite + TypeScript + Tailwind
│  └─ api/                 # NestJS + Swagger + Prisma
├─ packages/
│  └─ shared/              # shared dashboard/API types
├─ cli/                    # local reporter CLI
├─ docs/
├─ DEVELOPMENT.md
└─ README.md
```

## Deployment

GitHub `main` is connected to Zeabur.

- `npm run build`: Prisma generate, Vite build, NestJS build.
- `npm run start`: initialize PostgreSQL schema, then start NestJS.
- NestJS serves `/api/*`, `/api/docs`, and `apps/web/dist`.

Required Zeabur variable:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

Recommended:

```text
AUTH_SECRET=replace-with-a-long-random-string
NODE_ENV=production
```

## Login/Admin POC

- `/login` is the shared login page for dashboard and admin users.
- `/` is the protected dashboard.
- `/admin` is the protected admin console.
- The default admin account is seeded on startup into `app_accounts`.
- Passwords are stored as PBKDF2 hashes, not plaintext.
- `AUTH_SECRET` signs login cookies. Set it in Zeabur for production.
- Admin users can create frontend accounts and project bindings.
- Project bindings provide copyable CLI commands so a local folder can report as a configured project id.

## Project Grouping

Different local projects are separated by `Workspace`.

The CLI uses:

- `workspace.name`: the current folder name or a configured project id.
- `workspace.pathHash`: a hash of `process.cwd()`.

This prevents folders with the same display name from being merged accidentally.

## POC Project Management Direction

Admin and dashboard responsibilities are intentionally split:

- `/admin`: creates connected project bindings and copyable local monitor commands.
- `/`: lets the signed-in user choose which connected projects are visible.
- Hidden dashboard projects are stored in browser localStorage for this POC.
- Deleting a project binding in admin removes it from the connected project list.

The dashboard should gradually evolve into a project control panel that can show:

- project health summary
- open questions
- latest AI reply
- latest error
- whether user control/approval is needed
- active session and active AI tool

## Codex Wrapper POC

`monitor codex` is the first Codex CLI wrapper.

Current behavior:

- creates a session for the current project/workspace
- marks the session as `ai_loading`
- launches the local `codex` binary interactively
- sends heartbeat/status updates while Codex is running
- syncs a short stdout/stderr preview to the dashboard
- marks the session as `done` when Codex exits with code 0
- marks the session as `error` when Codex exits with a non-zero code

It does not capture full terminal streams yet. Future versions can add structured input/output capture, SSE/WebSocket updates, and user-control-needed signals.

## Clear Data

Data clearing is token-protected through the CLI:

- `monitor clear`: clear current session.
- `monitor clear --workspace`: clear sessions in the current project/workspace.
- `monitor clear --all`: clear all sessions uploaded by the current device.

Do not expose unauthenticated destructive actions on the public dashboard.
