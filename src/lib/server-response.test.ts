import { describe, expect, it, vi } from "vitest";
import { jsonFail, jsonOk, withApiErrorHandling } from "./server-response";

describe("server response helpers", () => {
  it("returns ok JSON without leaking payload details to error logs", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const response = jsonOk({ method: "GET", path: "/api/health", requestId: "req_test" }, { status: "ready" });

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("req_test");
    await expect(response.json()).resolves.toEqual({ ok: true, data: { status: "ready" }, requestId: "req_test" });
    expect(info).toHaveBeenCalledWith("[api]", expect.objectContaining({ event: "api_request", requestId: "req_test", method: "GET", path: "/api/health", status: 200 }));
    info.mockRestore();
  });

  it("normalizes handled errors", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = jsonFail({ method: "POST", path: "/api/test", requestId: "req_fail" }, "Supabase env is missing", 503);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Supabase env is missing", requestId: "req_fail" });
    expect(error).toHaveBeenCalledWith("[api]", expect.objectContaining({ event: "api_request", requestId: "req_fail", errorCode: "supabase_env_is_missing" }));
    error.mockRestore();
  });

  it("converts thrown errors into masked 500 responses", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await withApiErrorHandling({ method: "GET", path: "/api/test", requestId: "req_throw" }, () => {
      throw new Error("secret token failed");
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Internal server error", requestId: "req_throw" });
    expect(error).toHaveBeenCalledWith("[api]", expect.objectContaining({ event: "api_request", requestId: "req_throw", errorCode: "secret_token_failed" }));
    error.mockRestore();
  });
});
