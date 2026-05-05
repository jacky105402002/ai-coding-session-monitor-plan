# AI Coding Session Monitor

Mobile-friendly dashboard for monitoring local AI coding CLI sessions.

This repository is prepared for GitHub -> Zeabur deployment as a Next.js service with PostgreSQL.

## Target MVP Stack

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

The current first version is a deployable baseline. The formal MVP will be organized around the stack above. See `DEVELOPMENT.md`.

## Zeabur Environment Variables

Set these on the Zeabur web service:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

Do not commit a real database connection string. Keep it in Zeabur environment variables only.

Optional:

```text
DATABASE_SSL=true
MONITOR_API_URL=https://your-web-service.zeabur.app
```

Use `DATABASE_SSL=true` only if the database endpoint requires SSL.

## Build and Start

The current baseline can use the native Node.js deployment flow:

```bash
npm install
npm run build
npm run start
```

`npm run start` runs `node scripts/init-db.mjs` first, then starts Next.js. The database tables are created automatically when `DATABASE_URL` is available.

The app listens on the port provided by the platform through `PORT`.

## Local Development

Create a local `.env.local`:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

Then run:

```bash
npm install
npm run db:init
npm run dev
```

Open:

```text
http://localhost:3000
```

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

For production, point the CLI at the Zeabur service URL:

```bash
npm run monitor -- init --api-url https://your-web-service.zeabur.app
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

Not included:

- Full shell wrapping
- Terminal streaming
- Session replay
- Billing
- Push notifications
- IDE or browser extensions
