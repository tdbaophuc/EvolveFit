import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import type { FastifyCorsOptions } from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { assertApiConfig, corsAllowlist, defaultDevOrigins, isProductionLike, trustedOrigins, trustProxySetting } from "./lib/config";
import { createAdminStore, type AdminStore } from "./lib/admin-store";
import { createCatalogStore, type CatalogStore } from "./lib/catalog-store";
import { createRequestId, normalizeErrorCode, recordRequestLog, requestIdResponseHeader, sanitizeRequestId } from "./lib/observability";
import { createAppRepository, type AppRepository } from "./lib/repositories";
import { registerApiRoutes } from "./routes/api-routes";

declare module "fastify" {
  interface FastifyRequest {
    requestId: string;
    startTime: number;
    apiEnv: NodeJS.ProcessEnv;
    apiRepository: AppRepository;
    adminStore: AdminStore;
    catalogStore: CatalogStore;
  }
}

export const csrfHeaderName = "x-evolvefit-client";
const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function buildApp(env: NodeJS.ProcessEnv = process.env): Promise<FastifyInstance> {
  assertApiConfig(env);
  const app = Fastify({
    logger: false,
    bodyLimit: Number(env.API_BODY_LIMIT_BYTES ?? 1024 * 1024),
    trustProxy: trustProxySetting(env),
    requestIdHeader: false
  });
  const repository = createAppRepository(env);
  const adminStore = createAdminStore(env);
  const catalogStore = createCatalogStore(env);
  const productionLike = isProductionLike(env);

  app.addHook("onRequest", async (request, reply) => {
    request.requestId = sanitizeRequestId(request.headers["x-request-id"]?.toString()) ?? createRequestId();
    request.startTime = Date.now();
    request.apiEnv = env;
    request.apiRepository = repository;
    request.adminStore = adminStore;
    request.catalogStore = catalogStore;
    reply.header(requestIdResponseHeader(), request.requestId);
    setSecurityHeaders(reply, productionLike);
  });

  await app.register(cors, {
    origin: corsOrigin(env),
    credentials: true,
    allowedHeaders: ["content-type", "authorization", "x-request-id", csrfHeaderName],
    exposedHeaders: [requestIdResponseHeader(), "retry-after"],
    maxAge: 600
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    max: Number(env.API_RATE_LIMIT_MAX ?? 1000),
    timeWindow: env.API_RATE_LIMIT_WINDOW ?? "1 minute"
  });

  const groupedLimiter = createGroupedRateLimiter(env);
  app.addHook("preValidation", async (request, reply) => {
    const rateLimitResult = groupedLimiter(request);
    if (!rateLimitResult.allowed) {
      reply.header("retry-after", String(rateLimitResult.retryAfterSeconds));
      return sendError(reply, request, "Rate limit exceeded", 429, { group: rateLimitResult.group });
    }
    const csrfError = csrfViolation(request, env);
    if (csrfError) return sendError(reply, request, "Forbidden", 403, { reason: csrfError });
    sanitizeRequestBody(request);
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
    if (status >= 500) console.error("[api] unhandled error", { requestId: request.requestId, error: error instanceof Error ? error.stack : String(error) });
    sendError(reply, request, message, status, fastifyError.code && status < 500 ? { code: fastifyError.code } : undefined);
  });

  app.setNotFoundHandler((request, reply) => {
    sendError(reply, request, "Not found", 404);
  });

  registerApiRoutes(app, env);
  return app;
}

function corsOrigin(env: NodeJS.ProcessEnv): FastifyCorsOptions["origin"] {
  const configured = corsAllowlist(env);
  // Never reflect arbitrary origins with credentials. Development falls back to localhost only.
  const origins = configured.length ? configured : isProductionLike(env) ? [] : defaultDevOrigins();
  return ((origin: string | undefined, callback: (error: Error | null, origin?: boolean | string) => void) => {
    if (!origin) {
      callback(null, false);
      return;
    }
    callback(null, origins.includes(origin) ? origin : false);
  }) as FastifyCorsOptions["origin"];
}

/**
 * CSRF defence for cookie-authenticated requests (OWASP "custom request header" + origin verification):
 * - requests authenticated with an Authorization header are not CSRF-able and are exempt;
 * - otherwise a browser Origin/Referer, when present, must be a trusted origin, and the custom
 *   X-EvolveFit-Client header must be present, which cross-site pages cannot send without a CORS preflight.
 */
function csrfViolation(request: FastifyRequest, env: NodeJS.ProcessEnv): string | undefined {
  if (!unsafeMethods.has(request.method)) return undefined;
  if (env.API_CSRF_PROTECTION === "off" && !isProductionLike(env)) return undefined;
  const path = request.url.split("?")[0] ?? request.url;
  if (!path.startsWith("/api/") || path.startsWith("/api/cron/")) return undefined;
  if (request.headers.authorization) return undefined;

  const origin = request.headers.origin ?? refererOrigin(request.headers.referer);
  if (origin && origin !== "null" && !trustedOrigins(env).includes(origin)) return "untrusted-origin";
  if (origin === "null") return "untrusted-origin";
  if (!request.headers[csrfHeaderName]) return "missing-csrf-header";
  return undefined;
}

function refererOrigin(referer: string | undefined): string | undefined {
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return "null";
  }
}

function setSecurityHeaders(reply: FastifyReply, productionLike: boolean) {
  reply.header("x-content-type-options", "nosniff");
  reply.header("x-frame-options", "DENY");
  reply.header("referrer-policy", "no-referrer");
  reply.header("content-security-policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  reply.header("cross-origin-opener-policy", "same-origin");
  reply.header("cache-control", "no-store");
  if (productionLike) reply.header("strict-transport-security", "max-age=63072000; includeSubDomains");
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
  return reply.code(status).send({ ok: false, error, errorCode, details, requestId: request.requestId });
}

type RateLimitGroup = "admin" | "auth" | "cron" | "sync" | "write" | "public";

function createGroupedRateLimiter(env: NodeJS.ProcessEnv) {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  let nextSweepAt = Date.now() + 60_000;
  return (request: FastifyRequest): { allowed: true; group: RateLimitGroup } | { allowed: false; group: RateLimitGroup; retryAfterSeconds: number } => {
    if (request.method === "OPTIONS") return { allowed: true, group: "public" };
    const group = rateLimitGroup(request.method, request.url.split("?")[0] ?? request.url);
    const max = Number(env[`API_RATE_LIMIT_${group.toUpperCase()}_MAX`] ?? defaultRateLimitMax(group));
    const windowMs = Number(env[`API_RATE_LIMIT_${group.toUpperCase()}_WINDOW_MS`] ?? 60_000);
    const key = `${group}:${request.ip}`;
    const now = Date.now();
    if (now >= nextSweepAt) {
      // Bound memory: drop expired buckets so unique IPs cannot grow the map forever.
      for (const [bucketKey, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(bucketKey);
      nextSweepAt = now + 60_000;
    }
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
  if (path.startsWith("/api/admin") || path.startsWith("/api/observability") || path === "/api/supabase/verify") return "admin";
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

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, 4000);
  if (depth > 20) return undefined;
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, depth + 1));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "__proto__" && key !== "constructor" && key !== "prototype")
      .map(([key, child]) => [key, sanitizeValue(child, depth + 1)])
  );
}
