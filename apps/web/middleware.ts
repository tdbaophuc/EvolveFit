import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const publicRateLimitedPrefixes = ["/api/auth", "/api/leaderboards", "/api/notifications/subscribe", "/api/notifications/test"];
const authRateLimitedPrefixes = ["/api/sync", "/api/workouts", "/api/routines", "/api/exercises", "/api/coach"];
const requestIdHeader = "x-request-id";

export function middleware(request: NextRequest) {
  const requestId = request.headers.get(requestIdHeader) ?? `req_${crypto.randomUUID()}`;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(requestIdHeader, requestId);

  const pathname = request.nextUrl.pathname;
  const rateLimit = rateLimitFor(pathname);
  if (rateLimit) {
    const key = `${clientKey(request)}:${rateLimit.scope}:${pathname}`;
    const result = checkRateLimit({ key, limit: rateLimit.limit, windowMs: rateLimit.windowMs });
    if (!result.allowed) {
      logMiddleware({
        requestId,
        at: new Date().toISOString(),
        level: "warn",
        method: request.method,
        path: pathname,
        status: 429,
        source: "middleware",
        errorCode: normalizeErrorCode("rate limit exceeded")
      });
      return NextResponse.json(
        { ok: false, error: "Rate limit exceeded", requestId },
        {
          status: 429,
          headers: rateLimitHeaders(requestId, result)
        }
      );
    }
  }

  logMiddleware({
    requestId,
    at: new Date().toISOString(),
    level: "info",
    method: request.method,
    path: pathname,
    status: 0,
    source: "middleware"
  });

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(requestIdHeader, requestId);
  return response;
}

export const config = {
  matcher: ["/api/:path*"]
};

function rateLimitFor(pathname: string): { scope: "public" | "auth"; limit: number; windowMs: number } | undefined {
  if (publicRateLimitedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return { scope: "public", limit: 30, windowMs: 60_000 };
  }
  if (authRateLimitedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return { scope: "auth", limit: 120, windowMs: 60_000 };
  }
  return undefined;
}

function clientKey(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

function rateLimitHeaders(requestId: string, result: { limit: number; remaining: number; resetAt: number }) {
  return {
    [requestIdHeader]: requestId,
    "x-ratelimit-limit": String(result.limit),
    "x-ratelimit-remaining": String(result.remaining),
    "x-ratelimit-reset": new Date(result.resetAt).toISOString()
  };
}

function normalizeErrorCode(message: string): string {
  return message
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

function logMiddleware(payload: Record<string, unknown>) {
  console.info("[api]", { event: "api_request", ...payload });
}
