import { spawn } from "node:child_process";

const port = process.env.PORT ?? "5173";
const baseUrl = `http://127.0.0.1:${port}`;
const routes = [
  "/",
  "/hydration",
  "/api/health",
  "/api/integrations/status",
  "/api/auth/session",
  "/api/hydration/today"
];

const command = process.platform === "win32" ? ".\\node_modules\\.bin\\next.cmd" : "./node_modules/.bin/next";
const server = spawn(command, ["dev", "-p", port], {
  cwd: process.cwd(),
  env: normalizedEnv({ ...process.env, PORT: port }),
  shell: process.platform === "win32",
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
} catch (error) {
  exitCode = 1;
  console.error(error);
} finally {
  stopServer();
  setTimeout(() => process.exit(exitCode), 250);
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
  server.unref();
  if (server.exitCode !== null) return;

  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    killer.unref();
  } else {
    server.kill("SIGTERM");
  }
}
