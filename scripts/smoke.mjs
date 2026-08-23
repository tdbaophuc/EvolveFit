import { spawn, spawnSync } from "node:child_process";

const port = process.env.PORT ?? "5173";
const baseUrl = `http://127.0.0.1:${port}`;
const routes = [
  "/",
  "/hydration",
  "/api/health",
  "/api/integrations/status",
  "/api/docs/openapi",
  "/api/observability/logs",
  "/api/notifications/config",
  "/api/auth/session",
  "/api/hydration/today"
];

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", port], {
  cwd: process.cwd(),
  env: normalizedEnv({ ...process.env, PORT: port }),
  stdio: ["ignore", "pipe", "pipe"]
});

let output = "";
server.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

let exitCode = 0;

try {
  await waitForReady();
  for (const route of routes) {
    const response = await fetch(`${baseUrl}${route}`);
    if (!response.ok) {
      throw new Error(`${route} returned ${response.status}`);
    }
    console.log(`${route} => ${response.status}`);
  }
  const errorResponse = await fetch(`${baseUrl}/api/client-errors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId: "req_smoke", message: "Smoke client error", path: "/smoke" })
  });
  if (!errorResponse.ok) throw new Error(`/api/client-errors returned ${errorResponse.status}`);
  console.log(`/api/client-errors => ${errorResponse.status}`);
} catch (error) {
  exitCode = 1;
  console.error(error);
} finally {
  stopServer();
  process.exit(exitCode);
}

async function waitForReady() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30_000) {
    if (output.includes("Ready")) return;
    if (server.exitCode !== null) throw new Error(`dev server exited early\n${output}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`dev server did not become ready\n${output}`);
}

function normalizedEnv(env) {
  if (process.platform !== "win32") return env;
  const normalized = {};
  for (const [key, value] of Object.entries(env)) {
    if (!key || key.startsWith("=") || value === undefined) continue;
    const existingKey = Object.keys(normalized).find((item) => item.toLowerCase() === key.toLowerCase());
    if (existingKey) {
      delete normalized[existingKey];
    }
    normalized[key] = value;
  }
  return normalized;
}

function stopServer() {
  server.stdout.destroy();
  server.stderr.destroy();
  if (server.exitCode !== null) return;

  server.kill(process.platform === "win32" ? "SIGTERM" : "SIGTERM");
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore", timeout: 2_000 });
  }
}
