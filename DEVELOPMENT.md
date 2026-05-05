# 開發與部署規格

這份文件定義 AI Coding Session Monitor 的正式 MVP 技術棧。目前 repo 已整理為 `apps/web`、`apps/api`、`packages/shared` 的 monorepo 形狀，Zeabur 上仍以單一 Node.js service 部署，由 NestJS 同時提供 API 與前端靜態檔。

## 前端

- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui

前端定位為 mobile-first dashboard，用來顯示 device、workspace、AI coding session 狀態、latest input preview、latest output preview 與 last seen time。

## 後端

- NestJS
- TypeScript
- Swagger
- Prisma

後端定位為 API-first 架構，適合 AI SaaS 產品逐步擴充。API 需要保留清楚的 OpenAPI/Swagger 文件，讓 local reporter CLI、未來 mobile app、第三方 integration 都能穩定串接。

## 資料庫與資料層

- PostgreSQL 為主要資料庫。
- Prisma 只放在 TypeScript 後端，例如 NestJS。
- 前端不直接接資料庫。
- 資料庫連線字串必須放在部署平台環境變數，不得提交到 GitHub。

MVP 的主要資料模型：

- User
- Device
- Workspace
- Session
- Message

## 環境與部署

- Zeabur 用於 MVP、POC、個人專案與早期部署。
- GitHub 作為 Zeabur 自動部署來源。
- PostgreSQL 使用 Zeabur PostgreSQL service。
- Web/API service 透過 Zeabur environment variables 讀取 `DATABASE_URL`。

## Zeabur 環境變數

正式部署至少需要：

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

可選：

```text
DATABASE_SSL=true
NODE_ENV=production
```

## 專案結構

```text
.
├─ apps/
│  ├─ web/                 # React + Vite + TypeScript + Tailwind + shadcn/ui
│  └─ api/                 # NestJS + TypeScript + Swagger + Prisma
├─ packages/
│  └─ shared/              # shared types, API contracts, constants
├─ cli/                    # local reporter CLI
├─ docs/
│  └─ product-brief.md
├─ DEVELOPMENT.md
└─ README.md
```

## MVP API 範圍

- `POST /api/devices/register`
- `POST /api/devices/heartbeat`
- `POST /api/sessions`
- `PATCH /api/sessions/:sessionId/status`
- `POST /api/sessions/:sessionId/messages`
- `GET /api/dashboard`

## 部署策略

GitHub `main` 連動 Zeabur。每次完成 MVP 里程碑後推上 `main`，Zeabur 會自動 build 並重啟服務。

目前部署仍採單一服務：

- `npm run build`：Prisma generate、Vite build、NestJS build。
- `npm run start`：初始化 PostgreSQL schema，啟動 NestJS。
- NestJS 提供 `/api/*`、`/api/docs`，並 serve `apps/web/dist`。
