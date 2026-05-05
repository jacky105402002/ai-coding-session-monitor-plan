# AI Coding Session Monitor - AI Agent 實作執行說明

## 0. 文件用途

這份文件是給 AI coding agent 使用的實作指令文件。

當本文件被放入一個新的專案資料夾後，AI agent 應依照本文件的順序，自行規劃、建立、修改與驗證專案內容，完成 AI Coding Session Monitor 的 MVP。

本文件不是產品介紹文件，而是工程實作導向的任務說明。

## 1. 專案目標

建立一個 MVP 版本的 AI Coding Session Monitor。

此產品讓使用者可以透過手機或 Web App 查看不同電腦、不同專案、不同 AI CLI session 的狀態。

MVP 只做唯讀監控，不做遠端控制。

核心能力：

- 註冊使用者與裝置
- 建立 AI coding session
- 顯示 session 所屬裝置、專案、工具與對話標題
- 同步 session 狀態
- 同步最新使用者輸入 preview
- 同步最新 AI 輸出 preview
- 顯示 AI 是否 Loading 中
- 提供手機友善 Web Dashboard

## 2. AI Agent 權限與工作邊界

AI agent 可以自行在目前專案資料夾內進行以下操作：

- 建立檔案
- 修改檔案
- 安裝專案依賴
- 執行 build
- 執行 test
- 啟動本機開發伺服器
- 修正 lint/type/build/test 錯誤
- 依照現有專案結構調整實作方式

AI agent 應自行判斷工程細節，不需要每一步都詢問使用者。

但以下情況需要先詢問使用者：

- 需要修改專案資料夾以外的檔案
- 需要刪除大量檔案或執行破壞性操作
- 需要使用真實第三方付費服務
- 需要真實部署到正式環境
- 需要真實設定金流、OAuth production app、正式網域或憑證

如果使用者另外提供伺服器操作方式或部署方式，AI agent 應優先遵守使用者提供的部署指示。

## 3. MVP 範圍

### 必做

- Web dashboard
- Backend API
- Local reporter CLI prototype
- Device registration
- Session creation
- Heartbeat
- Session status update
- Message preview sync
- Mobile-friendly UI
- Basic local persistence or database schema
- README with setup and usage

### 不做

- 遠端 shell 控制
- 遠端命令執行
- 完整 terminal stream
- 多人團隊權限
- SaaS billing
- 真實手機 push notification
- 完整 session replay
- IDE plugin
- Browser extension

## 4. 建議技術棧

AI agent 可以依照專案實際情況調整，但若是從零開始，建議使用：

- Frontend: Next.js 或 React + Vite
- Backend: Next.js API routes、Hono、Express 或 NestJS
- Local CLI: Node.js
- Database: SQLite for MVP，PostgreSQL schema ready
- Realtime: polling first，SSE optional
- Language: TypeScript

如果使用 Next.js，建議 MVP 採用：

- Next.js App Router
- TypeScript
- SQLite 或檔案型 mock store
- API routes
- Responsive dashboard
- Node.js CLI script

## 5. 建議專案結構

AI agent 可以依照框架調整，但建議類似：

```text
.
├─ README.md
├─ package.json
├─ src/
│  ├─ app/
│  │  ├─ page.tsx
│  │  └─ api/
│  │     ├─ devices/
│  │     │  ├─ register/route.ts
│  │     │  └─ heartbeat/route.ts
│  │     ├─ sessions/
│  │     │  ├─ route.ts
│  │     │  └─ [sessionId]/
│  │     │     ├─ status/route.ts
│  │     │     └─ messages/route.ts
│  │     └─ dashboard/route.ts
│  ├─ components/
│  ├─ lib/
│  │  ├─ store.ts
│  │  ├─ auth.ts
│  │  ├─ ids.ts
│  │  └─ types.ts
│  └─ styles/
├─ cli/
│  └─ monitor.ts
└─ docs/
   └─ product-brief.md
```

## 6. 資料模型

AI agent 應建立以下核心資料模型。

### User

```ts
type User = {
  id: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
};
```

### Device

```ts
type Device = {
  id: string;
  userId: string;
  name: string;
  platform?: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
};
```

### Workspace

```ts
type Workspace = {
  id: string;
  userId: string;
  deviceId: string;
  type: "project" | "general";
  name: string;
  pathHash?: string;
  createdAt: string;
  updatedAt: string;
};
```

### Session

```ts
type Session = {
  id: string;
  userId: string;
  deviceId: string;
  workspaceId: string;
  tool: "codex" | "claude" | "aider" | "gemini" | "custom";
  title: string;
  status: "idle" | "ai_loading" | "waiting_user" | "done" | "error" | "offline";
  lastInputPreview?: string;
  lastOutputPreview?: string;
  lastMessageAt?: string;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
};
```

### Message

```ts
type Message = {
  id: string;
  userId: string;
  sessionId: string;
  role: "user" | "assistant" | "system" | "status";
  content: string;
  createdAt: string;
};
```

## 7. API 必要端點

AI agent 應實作以下 API。

### Register Device

```http
POST /api/devices/register
```

Request:

```json
{
  "displayName": "Jacky",
  "deviceName": "Win11 Desktop",
  "platform": "windows"
}
```

Response:

```json
{
  "userId": "usr_xxx",
  "deviceId": "dev_xxx",
  "deviceToken": "token_xxx"
}
```

### Heartbeat

```http
POST /api/devices/heartbeat
Authorization: Bearer <deviceToken>
```

Request:

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

Request:

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

Request:

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

Request:

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

Response 應回傳 dashboard 所需資料，例如：

```json
{
  "devices": [
    {
      "id": "dev_xxx",
      "name": "Win11 Desktop",
      "lastSeenAt": "2026-05-05T10:00:00.000Z",
      "workspaces": [
        {
          "id": "wks_xxx",
          "name": "my-project",
          "type": "project",
          "sessions": [
            {
              "id": "ses_xxx",
              "title": "Initial Codex Session",
              "tool": "codex",
              "status": "ai_loading",
              "lastInputPreview": "Please implement the dashboard",
              "lastOutputPreview": null,
              "lastMessageAt": "2026-05-05T10:00:00.000Z"
            }
          ]
        }
      ]
    }
  ]
}
```

## 8. Local Reporter CLI MVP

AI agent 應建立一個 local reporter CLI prototype。

CLI 最少支援：

```bash
monitor init
monitor demo
monitor status
```

如果可行，再支援：

```bash
monitor codex
```

### monitor init

功能：

- 詢問使用者名稱
- 詢問裝置名稱
- 呼叫 `/api/devices/register`
- 儲存 config

Config 建議位置：

```text
~/.ai-session-monitor/config.json
```

若 MVP 不方便寫入 home，可暫時使用專案內 `.local/config.json`，並在 README 說明。

### monitor demo

功能：

- 使用已註冊 device token
- 建立一個 demo session
- 模擬 user input
- 將狀態改成 `ai_loading`
- 等待數秒
- 模擬 assistant output
- 將狀態改成 `waiting_user` 或 `done`

此指令用於驗證整個系統從 local CLI 到 dashboard 的資料流。

### monitor status

功能：

- 顯示目前本機 config
- 顯示最近一次 heartbeat 或 API 連線狀態

## 9. Web Dashboard MVP

Dashboard 應使用 mobile-first 設計。

畫面需包含：

- Device list
- 每台 device 的 online/offline/last seen
- Workspace group
- Session cards
- Session status badge
- Latest input preview
- Latest output preview
- Last updated time

狀態顯示建議：

- `ai_loading`: AI 中 / Loading
- `waiting_user`: 等待使用者
- `idle`: 閒置
- `done`: 已完成
- `error`: 錯誤
- `offline`: 離線

UI 不需要做成 marketing landing page。第一個畫面就是實際 dashboard。

## 10. 隱私與安全規則

AI agent 應遵守：

- MVP 預設只同步 preview，不同步完整敏感內容。
- 不實作遠端命令執行。
- Device API 使用 Bearer token。
- Token 不應硬編碼在前端。
- Local path 預設只傳 path hash，不傳完整絕對路徑。
- Message preview 長度應限制，例如 300 字。
- API input 應做基本 validation。

建議支援簡單 privacy mode：

```ts
type PrivacyMode = "metadata_only" | "preview_only" | "full_messages";
```

MVP 預設：

```text
preview_only
```

## 11. 實作順序

AI agent 應依照以下順序實作。

### Step 1 - 專案初始化

- 檢查目前專案是否已存在 package.json。
- 若無，建立合適的 TypeScript Web 專案。
- 安裝必要依賴。
- 建立基本 README。

### Step 2 - 型別與資料層

- 建立核心 types。
- 建立 store。
- MVP 可先用 in-memory store 或 SQLite。
- 若用 in-memory store，README 需明確標註資料會在 server 重啟後消失。

### Step 3 - API

- 實作 device registration。
- 實作 heartbeat。
- 實作 create session。
- 實作 update session status。
- 實作 create message。
- 實作 dashboard data endpoint。
- 加入基本 token 驗證。

### Step 4 - Dashboard

- 建立 mobile-first dashboard。
- 從 `/api/dashboard` 讀取資料。
- 顯示 devices、workspaces、sessions。
- 顯示狀態、latest input/output preview、last seen。
- 加入 polling，例如每 5 秒更新一次。

### Step 5 - Local Reporter CLI

- 建立 `monitor init`。
- 建立 `monitor demo`。
- 建立 `monitor status`。
- 確保 CLI 可以連到本機開發伺服器。

### Step 6 - 驗證

- 執行 build。
- 執行 test 或 typecheck。
- 啟動本機 server。
- 執行 `monitor demo`。
- 確認 dashboard 可看到 demo session 狀態變化。
- 修正所有阻塞錯誤。

### Step 7 - 文件

README 至少包含：

- 產品用途
- 安裝方式
- 啟動方式
- CLI 使用方式
- API 說明
- MVP 限制
- 後續 Roadmap

## 12. 驗收條件

完成 MVP 時，應符合以下條件：

- 可以啟動 Web App。
- Dashboard 首頁可以正常開啟。
- 可以註冊 device。
- 可以建立 session。
- 可以更新 session status。
- 可以新增 message。
- Dashboard 可以看到最新狀態。
- `monitor demo` 可以產生一筆完整 demo flow。
- Mobile viewport 下 UI 可讀、可用、不重疊。
- 不含遠端命令執行功能。
- README 能讓下一位開發者照著跑起來。

## 13. 後續擴充方向

MVP 完成後，下一階段可以擴充：

- Codex wrapper
- Claude Code wrapper
- Aider wrapper
- Gemini CLI wrapper
- Generic CLI wrapper
- SSE realtime
- WebSocket realtime
- Browser notification
- LINE / Discord / Slack notification
- 多裝置 dashboard
- Session history
- Team workspace
- SaaS billing

其中「跨電腦、跨 CLI AI 工具的 session dashboard」是重要商機，應在資料模型與 UI 上預留擴充彈性。

## 14. AI Agent 執行原則

AI agent 在實作時應遵守：

- 先完成可跑的 MVP，再做優化。
- 優先使用簡單、可維護的架構。
- 不要過早導入複雜基礎設施。
- UI 應該像實際工具，不要做成 landing page。
- 保持 mobile-first。
- 所有狀態名稱應一致。
- 所有 API response 應可被前端直接使用。
- 若遇到技術限制，應選擇最小可行替代方案，並寫入 README。

## 15. 最終產品承諾

MVP 最重要的使用者價值是：

> 使用者打開手機 Web App，就能知道每台電腦上的 AI coding session 目前正在做什麼、屬於哪個專案、是否正在 Loading、是否正在等待自己回覆。

