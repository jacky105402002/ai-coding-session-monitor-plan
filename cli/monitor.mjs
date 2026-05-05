#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const localDir = join(rootDir, ".local");
const configPath = join(localDir, "config.json");
const currentSessionPath = join(localDir, "current-session.json");

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function positionalText() {
  return process.argv.slice(3).filter((item) => !item.startsWith("--")).join(" ").trim();
}

function apiUrl() {
  return argValue("--api-url", process.env.MONITOR_API_URL || "http://localhost:3000").replace(/\/$/, "");
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readConfig() {
  return readJson(configPath);
}

async function readCurrentSession() {
  return readJson(currentSessionPath);
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
    throw new Error(body.error || body.message || `${response.status} ${response.statusText}`);
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
  await writeJson(configPath, config);

  console.log(`Registered ${deviceName}`);
  console.log(`Config written to ${configPath}`);
}

async function requireConfig() {
  const config = await readConfig();
  if (!config?.deviceId || !config?.deviceToken) {
    throw new Error("Missing config. Run `node .\\cli\\monitor.mjs init` first.");
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

function workspacePayload() {
  const workspaceName = argValue("--workspace", basename(process.cwd()) || "General");
  const pathHash = createHash("sha256").update(process.cwd()).digest("hex").slice(0, 24);

  return {
    type: "project",
    name: workspaceName,
    pathHash
  };
}

async function createSession({ title, tool = "codex" } = {}) {
  const config = await requireConfig();
  await heartbeat();

  const created = await request("/api/sessions", {
    method: "POST",
    headers: { authorization: `Bearer ${config.deviceToken}` },
    body: JSON.stringify({
      workspace: workspacePayload(),
      tool,
      title: title || argValue("--title", `${workspacePayload().name} session`)
    })
  });

  const current = {
    apiUrl: apiUrl(),
    sessionId: created.sessionId,
    workspaceId: created.workspaceId,
    workspace: workspacePayload(),
    tool,
    title: title || argValue("--title", `${workspacePayload().name} session`),
    startedAt: new Date().toISOString()
  };
  await writeJson(currentSessionPath, current);

  console.log(`Session started: ${created.sessionId}`);
  console.log(`Workspace: ${current.workspace.name}`);
}

async function requireCurrentSession() {
  const current = await readCurrentSession();
  if (!current?.sessionId) {
    throw new Error("Missing current session. Run `node .\\cli\\monitor.mjs start` first.");
  }
  return current;
}

async function postMessage(role, content) {
  const config = await requireConfig();
  const current = await requireCurrentSession();

  await request(`/api/sessions/${current.sessionId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${config.deviceToken}` },
    body: JSON.stringify({ role, content })
  });

  return current;
}

async function updateStatus(status, payload = {}) {
  const config = await requireConfig();
  const current = await requireCurrentSession();

  await request(`/api/sessions/${current.sessionId}/status`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${config.deviceToken}` },
    body: JSON.stringify({ status, ...payload })
  });

  return current;
}

async function input(givenContent) {
  const content = givenContent || positionalText() || argValue("--text", "");
  if (!content) {
    throw new Error('Input text is required. Example: monitor input "Please fix the build"');
  }

  const current = await postMessage("user", content);
  await updateStatus("ai_loading", { lastInputPreview: content });
  console.log(`Input synced: ${current.sessionId}`);
}

async function output(givenContent) {
  const content = givenContent || positionalText() || argValue("--text", "");
  if (!content) {
    throw new Error('Output text is required. Example: monitor output "Build fixed"');
  }

  const current = await postMessage("assistant", content);
  await updateStatus("waiting_user", { lastOutputPreview: content });
  console.log(`Output synced: ${current.sessionId}`);
}

async function error() {
  const content = positionalText() || argValue("--text", "Session failed");
  const current = await postMessage("status", content);
  await updateStatus("error", { lastOutputPreview: content });
  console.log(`Session marked error: ${current.sessionId}`);
}

async function done() {
  const content = positionalText() || argValue("--text", "Session completed");
  const current = await postMessage("status", content);
  await updateStatus("done", { lastOutputPreview: content });
  console.log(`Session completed: ${current.sessionId}`);
}

async function current() {
  const value = await readCurrentSession();
  if (!value) {
    console.log("No current session.");
    return;
  }

  console.log(JSON.stringify(value, null, 2));
}

async function demo() {
  await createSession({ title: "Demo Codex Session", tool: "codex" });
  await input("Please organize the AI coding session monitor dashboard.");
  await new Promise((resolve) => setTimeout(resolve, 900));
  await output("Dashboard MVP completed: API, session cards, status badge, and Zeabur PostgreSQL are connected.");
}

function help() {
  console.log(`Usage:
  monitor init [--api-url http://localhost:3000] [--display-name Jacky] [--device-name "Win11 Desktop"]
  monitor status
  monitor start [--title "Feature work"] [--workspace project-name]
  monitor input "user prompt preview"
  monitor output "assistant response preview"
  monitor error "error summary"
  monitor done "completion summary"
  monitor current
  monitor demo

PowerShell friendly:
  $env:MONITOR_API_URL="https://coding-session.zeabur.app"
  node .\\cli\\monitor.mjs start --title "My session"
  node .\\cli\\monitor.mjs input "Please fix the API"
`);
}

const command = process.argv[2];

try {
  if (command === "init") {
    await init();
  } else if (command === "status") {
    await heartbeat();
  } else if (command === "start") {
    await createSession();
  } else if (command === "input") {
    await input();
  } else if (command === "output") {
    await output();
  } else if (command === "error") {
    await error();
  } else if (command === "done") {
    await done();
  } else if (command === "current") {
    await current();
  } else if (command === "demo") {
    await demo();
  } else {
    help();
  }
} catch (caughtError) {
  console.error(caughtError instanceof Error ? caughtError.message : caughtError);
  process.exitCode = 1;
}
