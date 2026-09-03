import type { FastifyReply, FastifyRequest } from "fastify";
import { normalizeErrorCode, recordRequestLog, requestIdResponseHeader } from "./observability";

type ApiContext = {
  method: string;
  path: string;
  request?: FastifyRequest;
  reply: FastifyReply;
};

export function requestIdFor(request?: FastifyRequest): string {
  return request?.requestId ?? "req_unknown";
}

export function jsonOk<T>(context: ApiContext, data: T, status = 200) {
  const requestId = requestIdFor(context.request);
  context.reply.header(requestIdResponseHeader(), requestId).code(status);
  return { ok: true, data, requestId };
}

export function jsonFail(context: ApiContext, error: string, status = 400) {
  const requestId = requestIdFor(context.request);
  context.reply.header(requestIdResponseHeader(), requestId).code(status);
  recordRequestLog({
    requestId,
    at: new Date().toISOString(),
    level: status >= 500 ? "error" : "warn",
    method: context.method,
    path: context.path,
    status,
    source: "api",
    errorCode: normalizeErrorCode(error),
    message: error
  });
  return { ok: false, error, requestId } as const;
}

export async function withApiErrorHandling<T>(
  context: ApiContext,
  handler: () => T | Promise<T>
): Promise<T | { ok: false; error: string; requestId: string }> {
  try {
    return await handler();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected API error";
    return jsonFail(context, message, 500);
  }
}
