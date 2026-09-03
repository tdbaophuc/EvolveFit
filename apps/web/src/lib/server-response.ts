import { NextResponse } from "next/server";
import {
  normalizeErrorCode,
  recordRequestLog,
  requestIdFromHeaders,
  requestIdResponseHeader,
  type StructuredRequestLog
} from "./observability";

export type ApiHandlerContext = {
  method: string;
  path: string;
  request?: Request;
  requestId?: string;
};

export function jsonOk<T>(context: ApiHandlerContext, data: T, init?: ResponseInit) {
  const requestId = resolveRequestId(context);
  logApi(context, init?.status ?? 200);
  return NextResponse.json({ ok: true, data, requestId }, withRequestIdHeader(init, requestId));
}

export function jsonFail(context: ApiHandlerContext, error: string, status = 400) {
  const requestId = resolveRequestId(context);
  logApi(context, status, error);
  return NextResponse.json({ ok: false, error, requestId }, withRequestIdHeader({ status }, requestId));
}

export async function withApiErrorHandling<T>(
  context: ApiHandlerContext,
  handler: () => T | Promise<T>
): Promise<T | NextResponse<{ ok: false; error: string }>> {
  try {
    return await handler();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    logApi(context, 500, message);
    const requestId = resolveRequestId(context);
    return NextResponse.json({ ok: false, error: "Internal server error", requestId }, withRequestIdHeader({ status: 500 }, requestId));
  }
}

function logApi(context: ApiHandlerContext, status: number, error?: string) {
  const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
  const payload: StructuredRequestLog = {
    requestId: resolveRequestId(context),
    at: new Date().toISOString(),
    level,
    method: context.method,
    path: context.path,
    status,
    source: "api",
    errorCode: error ? normalizeErrorCode(error) : undefined
  };
  recordRequestLog(payload);
}

function resolveRequestId(context: ApiHandlerContext): string {
  return context.requestId ?? (context.request ? requestIdFromHeaders(context.request.headers) : "req_local");
}

function withRequestIdHeader(init: ResponseInit | undefined, requestId: string): ResponseInit {
  return {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      [requestIdResponseHeader()]: requestId
    }
  };
}
