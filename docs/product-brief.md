# AI Coding Session Monitor MVP

This MVP turns local AI coding activity into a small remote dashboard.

The first deployment target is Zeabur:

- Next.js hosts the dashboard and API routes.
- PostgreSQL stores devices, workspaces, sessions, and message previews.
- A local Node.js reporter CLI registers a device and sends demo session updates.

The MVP intentionally syncs previews only. It does not stream full terminal output or store complete session replay data.
