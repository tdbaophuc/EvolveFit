import { cryptoSafeId } from "@evolvefit/shared";
import { getIntegrationStatus } from "./integrations";

export type RequestLogLevel = "info" | "warn" | "error";

export type StructuredRequestLog = {
  requestId: string;
  at: string;
  level: RequestLogLevel;
  method: string;
  path: string;
  status: number;
  durationMs?: number;
  source: "api" | "middleware" | "client";
  errorCode?: string;
  message?: string;
};

export type ClientErrorReport = {
  requestId: string;
  message: string;
  digest?: string;
  stack?: string;
  path?: string;
  userAgent?: string;
  reportedAt: string;
};

const requestIdHeader = "x-request-id";
const logs: StructuredRequestLog[] = [];
const clientErrors: ClientErrorReport[] = [];
const maxLogs = 200;
const maxClientErrors = 100;

export function createRequestId(): string {
  return `req_${cryptoSafeId()}`;
}

export function requestIdFromHeaders(headers: Headers): string {
  return headers.get(requestIdHeader) ?? createRequestId();
}

export function requestIdResponseHeader(): string {
  return requestIdHeader;
}

export function normalizeErrorCode(message: string): string {
  return message
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

export function recordRequestLog(log: StructuredRequestLog): StructuredRequestLog {
  logs.unshift(log);
  logs.splice(maxLogs);
  writeStructuredLog(log);
  return log;
}

export function listRequestLogs(requestId?: string): StructuredRequestLog[] {
  return requestId ? logs.filter((log) => log.requestId === requestId) : logs;
}

export function recordClientError(input: Omit<ClientErrorReport, "requestId" | "reportedAt"> & { requestId?: string }): ClientErrorReport {
  const report = {
    ...input,
    requestId: input.requestId ?? createRequestId(),
    reportedAt: new Date().toISOString()
  };
  clientErrors.unshift(report);
  clientErrors.splice(maxClientErrors);
  recordRequestLog({
    requestId: report.requestId,
    at: report.reportedAt,
    level: "error",
    method: "CLIENT",
    path: report.path ?? "/",
    status: 0,
    source: "client",
    errorCode: normalizeErrorCode(report.message),
    message: report.digest ? `${report.message} (${report.digest})` : report.message
  });
  return report;
}

export function listClientErrors(requestId?: string): ClientErrorReport[] {
  return requestId ? clientErrors.filter((report) => report.requestId === requestId) : clientErrors;
}

export function observabilitySnapshot(env: NodeJS.ProcessEnv = process.env) {
  const integrations = getIntegrationStatus(env);
  return {
    checkedAt: new Date().toISOString(),
    integrations,
    requestLogCount: logs.length,
    clientErrorCount: clientErrors.length,
    recentErrors: logs.filter((log) => log.level === "error").slice(0, 5),
    status: Object.values(integrations).some((status) => status === "missing-env") ? "degraded" : "ready"
  };
}

function writeStructuredLog(log: StructuredRequestLog) {
  const line = { event: "api_request", ...log };
  if (log.level === "error") {
    console.error("[api]", line);
    return;
  }
  if (log.level === "warn") {
    console.warn("[api]", line);
    return;
  }
  console.info("[api]", line);
}
