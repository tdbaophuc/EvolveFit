import { describe, expect, it, vi } from "vitest";
import { checkRateLimit, resetRateLimitBuckets } from "./rate-limit";
import { listClientErrors, listRequestLogs, recordClientError, recordRequestLog } from "./observability";
import openApiSpec from "../../../../docs/api-v1.openapi.json";

describe("observability contracts", () => {
  it("stores structured logs by request id", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    recordRequestLog({
      requestId: "req_lookup",
      at: "2026-08-23T00:00:00.000Z",
      level: "info",
      method: "GET",
      path: "/api/health",
      status: 200,
      source: "api"
    });

    expect(listRequestLogs("req_lookup")[0]).toMatchObject({ requestId: "req_lookup", path: "/api/health" });
    info.mockRestore();
  });

  it("records client errors with request ids", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const report = recordClientError({ requestId: "req_client", message: "Render failed", path: "/" });

    expect(report.requestId).toBe("req_client");
    expect(listClientErrors("req_client")[0]).toMatchObject({ message: "Render failed" });
    expect(listRequestLogs("req_client")[0]).toMatchObject({ source: "client", errorCode: "render_failed" });
    error.mockRestore();
  });

  it("rate limits by key and exposes reset time", () => {
    resetRateLimitBuckets();
    expect(checkRateLimit({ key: "ip:/api/auth/sign-in", limit: 2, windowMs: 60_000, now: 0 }).allowed).toBe(true);
    expect(checkRateLimit({ key: "ip:/api/auth/sign-in", limit: 2, windowMs: 60_000, now: 1 }).allowed).toBe(true);
    const limited = checkRateLimit({ key: "ip:/api/auth/sign-in", limit: 2, windowMs: 60_000, now: 2 });
    expect(limited).toMatchObject({ allowed: false, limit: 2, remaining: 0 });
    expect(limited.resetAt).toBe(60_000);
  });

  it("ships readable OpenAPI V1 docs from the repo", () => {
    expect(openApiSpec.openapi).toBe("3.1.0");
    expect(openApiSpec.paths["/api/sync/batch"].post.summary).toContain("Sync");
    expect(openApiSpec.paths["/api/client-errors"].post.summary).toContain("client error");
  });
});
