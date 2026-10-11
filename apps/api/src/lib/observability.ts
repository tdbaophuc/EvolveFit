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

/** Accepts client-supplied request ids only when they are short and log-safe. */
export function sanitizeRequestId(value: string | undefined): string | undefined {
  return value && /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : undefined;
}

/** Removes credentials and personal data that commonly leak into client error reports. */
export function redactText(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]+)?/g, "[redacted-jwt]")
    .replace(/((?:access|refresh)_?token|api_?key|apikey|password|secret|code)=([^&\s"']+)/gi, "$1=[redacted]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted-email]");
}

export function stripQuery(path: string): string {
  return path.split(/[?#]/)[0] ?? path;
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
  const report: ClientErrorReport = {
    requestId: sanitizeRequestId(input.requestId) ?? createRequestId(),
    message: redactText(input.message).slice(0, 2000),
    digest: input.digest ? redactText(input.digest).slice(0, 200) : undefined,
    stack: input.stack ? redactText(input.stack).split("\n").slice(0, 30).join("\n").slice(0, 4000) : undefined,
    path: input.path ? stripQuery(input.path).slice(0, 500) : undefined,
    userAgent: input.userAgent?.slice(0, 300),
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
    message: (report.digest ? `${report.message} (${report.digest})` : report.message).slice(0, 500)
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
