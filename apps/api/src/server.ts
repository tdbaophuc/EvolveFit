import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app";
import { ConfigError } from "./lib/config";

// Local development reads apps/api/.env. Variables already set by the shell or the hosting platform win,
// and production images ship without a .env file (see Dockerfile / .dockerignore).
const envFile = fileURLToPath(new URL("../.env", import.meta.url));
if (process.env.API_SKIP_DOTENV !== "true" && existsSync(envFile)) process.loadEnvFile(envFile);

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

let app: Awaited<ReturnType<typeof buildApp>>;
try {
  app = await buildApp();
} catch (error) {
  console.error(error instanceof ConfigError ? error.message : error);
  process.exit(1);
}

try {
  await app.listen({ port, host });
  console.log(`EvolveFit API listening on http://${host}:${port}`);
} catch (error) {
  console.error("[api] failed to start", error);
  process.exit(1);
}

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[api] ${signal} received, draining connections`);
  const forceExit = setTimeout(() => process.exit(1), Number(process.env.SHUTDOWN_TIMEOUT_MS ?? 10_000));
  forceExit.unref();
  try {
    await app.close();
    process.exit(0);
  } catch (error) {
    console.error("[api] shutdown failed", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  console.error("[api] unhandled rejection", reason instanceof Error ? reason.stack : reason);
});
