import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
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
  const app = Fastify({ logger: false });
  const repository = createAppRepository(env);

  await app.register(cors, {
    origin: corsOrigin(env.API_CORS_ORIGIN),
    credentials: true
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    max: Number(env.API_RATE_LIMIT_MAX ?? 1000),
    timeWindow: env.API_RATE_LIMIT_WINDOW ?? "1 minute"
  });

  app.addHook("onRequest", async (request, reply) => {
    request.requestId = request.headers["x-request-id"]?.toString() ?? createRequestId();
    request.startTime = Date.now();
    request.apiEnv = env;
    request.apiRepository = repository;
    request.apiUser = demoUser();
    reply.header(requestIdResponseHeader(), request.requestId);
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
    const fastifyError = error as { statusCode?: number; message?: string };
    const status = fastifyError.statusCode && fastifyError.statusCode >= 400 ? fastifyError.statusCode : 500;
    sendError(reply, request, fastifyError.message || "Unexpected API error", status);
  });

  registerApiRoutes(app, env);
  return app;
}

function corsOrigin(value?: string) {
  if (!value) return true;
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length === 1 ? origins[0] : origins;
}

function sendError(reply: FastifyReply, request: FastifyRequest, error: string, status: number) {
  recordRequestLog({
    requestId: request.requestId,
    at: new Date().toISOString(),
    level: status >= 500 ? "error" : "warn",
    method: request.method,
    path: request.url.split("?")[0] ?? request.url,
    status,
    source: "api",
    errorCode: normalizeErrorCode(error),
    message: error
  });
  reply.code(status).send({ ok: false, error, requestId: request.requestId });
}
