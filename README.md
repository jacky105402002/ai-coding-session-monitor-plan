# AI Coding Session Monitor

Mobile-friendly dashboard for monitoring local AI coding CLI sessions.

This repository is prepared for GitHub -> Zeabur deployment as a single Node.js service. NestJS serves both the API and the Vite-built dashboard.

## Stack

Frontend:

- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend:

- NestJS
- TypeScript
- Swagger
- Prisma

Data and deployment:

- PostgreSQL
- Zeabur for MVP, POC, personal projects, and early deployments

See `DEVELOPMENT.md` for the longer architecture notes.

## Project Structure

```text
.
├─ apps/
│  ├─ api/                 # NestJS + Swagger + Prisma
│  └─ web/                 # React + Vite + Tailwind CSS
├─ packages/
│  └─ shared/              # shared dashboard/API types
├─ cli/                    # local reporter CLI
└─ docs/
```

## Zeabur Environment Variables

Set these on the Zeabur web service:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

Do not commit a real database connection string. Keep it in Zeabur environment variables only.

Optional:

```text
MONITOR_API_URL=https://your-web-service.zeabur.app
AUTH_SECRET=replace-with-a-long-random-string
```

## Build and Start

Zeabur can use the native Node.js deployment flow:

```bash
npm install
npm run build
npm run start
```

`npm run build` builds `apps/web` first, then `apps/api`.

`npm run start` runs the compiled database initializer, then starts NestJS:

```bash
node apps/api/dist/apps/api/src/scripts/init-db.js && node apps/api/dist/apps/api/src/main.js
```

The database tables are created automatically when `DATABASE_URL` is available.

The app listens on the port provided by the platform through `PORT`.

## Local Development

Create a local `.env` or set `DATABASE_URL` in your shell:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

Then run:

```bash
npm install
npm run build
npm run start
```

Open:

```text
http://localhost:3000
```

For frontend-only iteration:

```bash
npm run dev:web
```

For API-only iteration:

```bash
npm run dev:api
```

Swagger docs are available at:

```text
http://localhost:3000/api/docs
```

## Login and Admin

The public dashboard requires login:

```text
https://your-web-service.zeabur.app/login
```

Admin console:

```text
https://your-web-service.zeabur.app/admin
```

The first admin account is seeded automatically during service startup. The seeded admin account can access both the frontend dashboard and the admin console.

Admin console features:

- create frontend user accounts
- create project bindings
- delete project bindings
- copy project binding commands for local project folders

Dashboard project visibility:

- Admin defines which projects are connected.
- The dashboard `Visible Projects` control adds connected projects to the current view.
- Each visible project can be hidden with the `X` button without deleting the admin binding.
- Visibility is stored per browser in localStorage for this POC.

Do not commit plaintext passwords. For production, set a strong `AUTH_SECRET` in Zeabur.

## Reporter CLI

Register a local device:

```bash
npm run monitor -- init --api-url http://localhost:3000 --display-name Jacky --device-name "Win11 Desktop"
```

Send a demo session:

```bash
npm run monitor -- demo --api-url http://localhost:3000
```

Check heartbeat:

```bash
npm run monitor -- status --api-url http://localhost:3000
```

Start a real POC session from the current project folder:

```bash
npm run monitor -- start --title "Fix API build"
npm run monitor -- input "Please fix the API build error"
npm run monitor -- output "Build error fixed and tests passed"
npm run monitor -- done "Ready for review"
```

Sessions are grouped by workspace. The CLI uses the current folder name and a hash of `process.cwd()` so different project folders show as separate projects on the dashboard.

Clear dashboard data owned by the registered local device:

```bash
npm run monitor -- clear              # clear current session
npm run monitor -- clear --workspace  # clear sessions in the current project/workspace
npm run monitor -- clear --all        # clear all sessions uploaded by this device
```

Wrap a Codex CLI session from the current project folder:

```bash
npm run monitor -- codex --title "Implement auth flow"
```

Power users can pass arguments to Codex after `--`:

```bash
npm run monitor -- codex --title "Explain repo" -- --help
```

The wrapper keeps Codex interactive in your terminal. The dashboard receives session start, running, done, and error status updates.
While Codex is running, the wrapper sends heartbeat/status updates and a short stdout/stderr preview.
When Codex exits, the wrapper stores the command and final stdout/stderr transcript as session messages so `Show Messages` can verify what happened.

Quick production smoke test:

```powershell
$env:MONITOR_API_URL="https://coding-session.zeabur.app"
node D:\code\codex\ai-coding-session-monitor-plan\cli\monitor.mjs codex --workspace ai-session-monitor --title "Codex wrapper smoke test" -- --help
```

For production, point the CLI at the Zeabur service URL:

```bash
npm run monitor -- init --api-url https://your-web-service.zeabur.app
```

In PowerShell, if `--` is hard to type cleanly, use:

```powershell
$env:MONITOR_API_URL="https://your-web-service.zeabur.app"
node .\cli\monitor.mjs init
node .\cli\monitor.mjs start --title "Fix API build"
node .\cli\monitor.mjs input "Please fix the API build error"
node .\cli\monitor.mjs output "Build error fixed and tests passed"
node .\cli\monitor.mjs clear --workspace
node .\cli\monitor.mjs codex --title "Implement auth flow"
node .\cli\monitor.mjs demo
```

CLI config is stored in:

```text
.local/config.json
```

This file is ignored by git because it contains the device token.

## API

### Register Device

```http
POST /api/devices/register
```

```json
{
  "displayName": "Jacky",
  "deviceName": "Win11 Desktop",
  "platform": "windows"
}
```

### Heartbeat

```http
POST /api/devices/heartbeat
Authorization: Bearer <deviceToken>
```

```json
{
  "deviceId": "dev_xxx"
}
```

### Create Session

```http
POST /api/sessions
Authorization: Bearer <deviceToken>
```

```json
{
  "workspace": {
    "type": "project",
    "name": "my-project",
    "pathHash": "hash_only"
  },
  "tool": "codex",
  "title": "Initial Codex Session"
}
```

### Update Session Status

```http
PATCH /api/sessions/:sessionId/status
Authorization: Bearer <deviceToken>
```

```json
{
  "status": "ai_loading",
  "lastInputPreview": "Please implement the dashboard",
  "lastOutputPreview": null
}
```

### Create Message

```http
POST /api/sessions/:sessionId/messages
Authorization: Bearer <deviceToken>
```

```json
{
  "role": "assistant",
  "content": "Dashboard implementation completed."
}
```

### Dashboard Data

```http
GET /api/dashboard
```

## MVP Scope

Included:

- Device registration
- Device heartbeat
- Session creation
- Status updates
- Message preview sync
- Mobile-first dashboard
- PostgreSQL persistence
- Local reporter CLI prototype
- Project/workspace grouping by local folder
- Token-protected CLI clearing for current session, current workspace, or current device

Not included:

- Full shell wrapping
- Terminal streaming
- Session replay
- Billing
- Push notifications
- IDE or browser extensions

## POC Project Management Direction

The dashboard already groups sessions by device and workspace. The next POC project-management layer will add:

- project-level health summary
- open questions
- latest AI reply
- latest error
- whether user control/approval is needed
- session owner and active tool
