import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import type { FastifyCorsOptions } from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { createRequestId, normalizeErrorCode, recordRequestLog, requestIdResponseHeader } from "./lib/observability";
import { createAppRepository, demoUser, type ApiUser, type AppRepository } from "./lib/repositories";
import { registerApiRoutes } from "./routes/api-routes";

declare module "fastify" {
  interface FastifyRequest {
    requestId: string;
    startTime: number;
    apiEnv: NodeJS.ProcessEnv;
    apiRepository: AppRepository;
    apiUser?: ApiUser;
  }
}

export async function buildApp(env: NodeJS.ProcessEnv = process.env): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, bodyLimit: Number(env.API_BODY_LIMIT_BYTES ?? 1024 * 1024) });
  const repository = createAppRepository(env);

  app.addHook("onRequest", async (request, reply) => {
    request.requestId = request.headers["x-request-id"]?.toString() ?? createRequestId();
    request.startTime = Date.now();
    request.apiEnv = env;
    request.apiRepository = repository;
    request.apiUser = demoUser();
    reply.header(requestIdResponseHeader(), request.requestId);
  });

  await app.register(cors, {
    origin: corsOrigin(env),
    credentials: true
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    max: Number(env.API_RATE_LIMIT_MAX ?? 1000),
    timeWindow: env.API_RATE_LIMIT_WINDOW ?? "1 minute"
  });

  const groupedLimiter = createGroupedRateLimiter(env);
  app.addHook("preValidation", async (request, reply) => {
    sanitizeRequestBody(request);
    const rateLimitResult = groupedLimiter(request);
    if (!rateLimitResult.allowed) {
      reply.header("retry-after", String(rateLimitResult.retryAfterSeconds));
      sendError(reply, request, "Rate limit exceeded", 429, { group: rateLimitResult.group });
    }
  });

  app.addHook("onResponse", async (request, reply) => {
    recordRequestLog({
      requestId: request.requestId,
      at: new Date().toISOString(),
      level: reply.statusCode >= 500 ? "error" : reply.statusCode >= 400 ? "warn" : "info",
      method: request.method,
      path: request.url.split("?")[0] ?? request.url,
      status: reply.statusCode,
      durationMs: Date.now() - request.startTime,
      source: "api"
    });
  });

  app.setErrorHandler((error, request, reply) => {
    const fastifyError = error as { code?: string; statusCode?: number; message?: string };
    const status = fastifyError.statusCode && fastifyError.statusCode >= 400 ? fastifyError.statusCode : 500;
    const message = status >= 500 ? "Unexpected API error" : fastifyError.message || "Invalid request";
    sendError(reply, request, message, status, fastifyError.code ? { code: fastifyError.code } : undefined);
  });

  registerApiRoutes(app, env);
  return app;
}

function corsOrigin(env: NodeJS.ProcessEnv): FastifyCorsOptions["origin"] {
  const value = env.API_CORS_ORIGIN;
  if (!value) return env.NODE_ENV === "production" ? false : true;
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return ((origin: string | undefined, callback: (error: Error | null, origin?: boolean | string) => void) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, origins.includes(origin) ? origin : false);
  }) as FastifyCorsOptions["origin"];
}

function sendError(reply: FastifyReply, request: FastifyRequest, error: string, status: number, details?: unknown) {
  const errorCode = normalizeErrorCode(error);
  recordRequestLog({
    requestId: request.requestId,
    at: new Date().toISOString(),
    level: status >= 500 ? "error" : "warn",
    method: request.method,
    path: request.url.split("?")[0] ?? request.url,
    status,
    source: "api",
    errorCode,
    message: error
  });
  reply.code(status).send({ ok: false, error, errorCode, details, requestId: request.requestId });
}

type RateLimitGroup = "admin" | "auth" | "cron" | "sync" | "write" | "public";

function createGroupedRateLimiter(env: NodeJS.ProcessEnv) {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return (request: FastifyRequest): { allowed: true; group: RateLimitGroup } | { allowed: false; group: RateLimitGroup; retryAfterSeconds: number } => {
    if (request.method === "OPTIONS") return { allowed: true, group: "public" };
    const group = rateLimitGroup(request.method, request.url.split("?")[0] ?? request.url);
    const max = Number(env[`API_RATE_LIMIT_${group.toUpperCase()}_MAX`] ?? defaultRateLimitMax(group));
    const windowMs = Number(env[`API_RATE_LIMIT_${group.toUpperCase()}_WINDOW_MS`] ?? 60_000);
    const key = `${group}:${request.ip}`;
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, group };
    }
    bucket.count += 1;
    if (bucket.count <= max) return { allowed: true, group };
    return { allowed: false, group, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  };
}

function rateLimitGroup(method: string, path: string): RateLimitGroup {
  if (path.startsWith("/api/admin")) return "admin";
  if (path.startsWith("/api/auth")) return "auth";
  if (path.startsWith("/api/cron")) return "cron";
  if (path === "/api/sync/batch") return "sync";
  if (method !== "GET" && path.startsWith("/api/")) return "write";
  return "public";
}

function defaultRateLimitMax(group: RateLimitGroup): number {
  if (group === "admin") return 60;
  if (group === "auth") return 30;
  if (group === "cron") return 20;
  if (group === "sync") return 120;
  if (group === "write") return 180;
  return 600;
}

function sanitizeRequestBody(request: FastifyRequest): void {
  if (!request.body || typeof request.body !== "object") return;
  request.body = sanitizeValue(request.body);
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, 4000);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, sanitizeValue(child)]));
}
