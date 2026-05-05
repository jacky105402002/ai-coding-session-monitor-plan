#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const configPath = join(rootDir, ".local", "config.json");

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function apiUrl() {
  return argValue("--api-url", process.env.MONITOR_API_URL || "http://localhost:3000").replace(/\/$/, "");
}

async function readConfig() {
  try {
    return JSON.parse(await readFile(configPath, "utf8"));
  } catch {
    return null;
  }
}

async function writeConfig(config) {
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl()}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || `${response.status} ${response.statusText}`);
  }

  return body;
}

async function init() {
  const displayName = argValue("--display-name", process.env.USERNAME || process.env.USER || "Monitor User");
  const deviceName = argValue("--device-name", process.env.COMPUTERNAME || "Local Device");
  const platform = argValue("--platform", process.platform);

  const result = await request("/api/devices/register", {
    method: "POST",
    body: JSON.stringify({ displayName, deviceName, platform })
  });

  const config = {
    apiUrl: apiUrl(),
    userId: result.userId,
    deviceId: result.deviceId,
    deviceToken: result.deviceToken,
    createdAt: new Date().toISOString()
  };
  await writeConfig(config);

  console.log(`Registered ${deviceName}`);
  console.log(`Config written to ${configPath}`);
}

async function requireConfig() {
  const config = await readConfig();
  if (!config?.deviceId || !config?.deviceToken) {
    throw new Error("Missing config. Run `npm run monitor -- init` first.");
  }
  return config;
}

async function heartbeat() {
  const config = await requireConfig();
  await request("/api/devices/heartbeat", {
    method: "POST",
    headers: { authorization: `Bearer ${config.deviceToken}` },
    body: JSON.stringify({ deviceId: config.deviceId })
  });
  console.log(`Heartbeat OK for ${config.deviceId}`);
}

async function demo() {
  const config = await requireConfig();
  await heartbeat();

  const workspaceName = argValue("--workspace", "ai-coding-session-monitor-plan");
  const pathHash = createHash("sha256").update(process.cwd()).digest("hex").slice(0, 24);
  const created = await request("/api/sessions", {
    method: "POST",
    headers: { authorization: `Bearer ${config.deviceToken}` },
    body: JSON.stringify({
      workspace: {
        type: "project",
        name: workspaceName,
        pathHash
      },
      tool: "codex",
      title: "Demo Codex Session"
    })
  });

  await request(`/api/sessions/${created.sessionId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${config.deviceToken}` },
    body: JSON.stringify({
      role: "user",
      content: "請幫我整理 AI coding session monitor dashboard。"
    })
  });

  await request(`/api/sessions/${created.sessionId}/status`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${config.deviceToken}` },
    body: JSON.stringify({
      status: "ai_loading",
      lastInputPreview: "請幫我整理 AI coding session monitor dashboard。"
    })
  });

  await new Promise((resolve) => setTimeout(resolve, 900));

  await request(`/api/sessions/${created.sessionId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${config.deviceToken}` },
    body: JSON.stringify({
      role: "assistant",
      content: "Dashboard MVP 已完成：API、session cards、狀態 badge 和 Zeabur PostgreSQL 連線都已準備好。"
    })
  });

  await request(`/api/sessions/${created.sessionId}/status`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${config.deviceToken}` },
    body: JSON.stringify({
      status: "waiting_user",
      lastOutputPreview:
        "Dashboard MVP 已完成：API、session cards、狀態 badge 和 Zeabur PostgreSQL 連線都已準備好。"
    })
  });

  console.log(`Demo session created: ${created.sessionId}`);
}

function help() {
  console.log(`Usage:
  monitor init [--api-url http://localhost:3000] [--display-name Jacky] [--device-name "Win11 Desktop"]
  monitor demo [--api-url http://localhost:3000] [--workspace project-name]
  monitor status [--api-url http://localhost:3000]
`);
}

const command = process.argv[2];

try {
  if (command === "init") {
    await init();
  } else if (command === "demo") {
    await demo();
  } else if (command === "status") {
    await heartbeat();
  } else {
    help();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
