# 開發與部署規格

這份文件定義 AI Coding Session Monitor 的正式 MVP 目標技術棧。第一版 repo baseline 先提供可部署雛形，後續 MVP 會依此規格整理成前後端分離架構。

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

## 建議正式 MVP 專案結構

```text
.
├─ apps/
│  ├─ web/                 # React + Vite + TypeScript + Tailwind + shadcn/ui
│  └─ api/                 # NestJS + TypeScript + Swagger + Prisma
├─ packages/
│  └─ shared/              # shared types, API contracts, constants
├─ prisma/                 # Prisma schema and migrations, if kept at repo root
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

## 第一版策略

第一版先上 GitHub，讓 Zeabur 可以連動 repo。後續完成正式 MVP 後，直接覆蓋 `main`，Zeabur 會依 GitHub 更新自動重新部署。
