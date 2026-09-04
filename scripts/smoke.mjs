import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const webPort = process.env.PORT ?? "5173";
const apiPort = process.env.API_PORT ?? "4174";
const baseUrl = `http://127.0.0.1:${webPort}`;
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? `http://127.0.0.1:${apiPort}`;
const nextCli = require.resolve("next/dist/bin/next");
const tsxCli = require.resolve("tsx/cli");
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

const apiServer = spawn(process.execPath, [tsxCli, "apps/api/src/server.ts"], {
  cwd: process.cwd(),
  env: normalizedEnv({
    ...process.env,
    PORT: apiPort,
    API_CORS_ORIGIN: process.env.API_CORS_ORIGIN ?? baseUrl
  }),
  stdio: ["ignore", "pipe", "pipe"]
});
apiServer.unref();

const webServer = spawn(process.execPath, [nextCli, "dev", "apps/web", "-p", webPort], {
  cwd: process.cwd(),
  env: normalizedEnv({
    ...process.env,
    PORT: webPort,
    NEXT_PUBLIC_API_BASE_URL: apiBaseUrl
  }),
  stdio: ["ignore", "pipe", "pipe"]
});
webServer.unref();

let apiOutput = "";
let webOutput = "";
apiServer.stdout.on("data", (chunk) => {
  apiOutput += chunk.toString();
});
apiServer.stderr.on("data", (chunk) => {
  apiOutput += chunk.toString();
});
webServer.stdout.on("data", (chunk) => {
  webOutput += chunk.toString();
});
webServer.stderr.on("data", (chunk) => {
  webOutput += chunk.toString();
});

let exitCode = 0;

try {
  await waitForHttp(`${apiBaseUrl}/api/health`, "api");
  await waitForHttp(`${baseUrl}/`, "web");
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
  const coachResponse = await fetch(`${baseUrl}/api/coach/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  if (!coachResponse.ok) throw new Error(`/api/coach/recommend returned ${coachResponse.status}`);
  console.log(`/api/coach/recommend => ${coachResponse.status}`);
} catch (error) {
  exitCode = 1;
  console.error(error);
} finally {
  stopServer(webServer);
  stopServer(apiServer);
  process.exit(exitCode);
}

async function waitForHttp(url, name) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30_000) {
    if (apiServer.exitCode !== null) throw new Error(`api server exited early\n${apiOutput}`);
    if (webServer.exitCode !== null) throw new Error(`web server exited early\n${webOutput}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Keep polling until both dev servers are listening.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${name} server did not become ready\napi:\n${apiOutput}\nweb:\n${webOutput}`);
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

function stopServer(server) {
  server.stdout.destroy();
  server.stderr.destroy();
  if (server.exitCode !== null) return;

  server.kill("SIGTERM");
}
