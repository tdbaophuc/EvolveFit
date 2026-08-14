import { describe, expect, it, vi } from "vitest";
import { jsonFail, jsonOk, withApiErrorHandling } from "./server-response";

describe("server response helpers", () => {
  it("returns ok JSON without leaking payload details to error logs", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const response = jsonOk({ method: "GET", path: "/api/health" }, { status: "ready" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data: { status: "ready" } });
    expect(info).toHaveBeenCalledWith("[api]", expect.objectContaining({ method: "GET", path: "/api/health", status: 200 }));
    info.mockRestore();
  });

  it("normalizes handled errors", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = jsonFail({ method: "POST", path: "/api/test" }, "Supabase env is missing", 503);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Supabase env is missing" });
    expect(error).toHaveBeenCalledWith("[api]", expect.objectContaining({ errorCode: "supabase_env_is_missing" }));
    error.mockRestore();
  });

  it("converts thrown errors into masked 500 responses", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await withApiErrorHandling({ method: "GET", path: "/api/test" }, () => {
      throw new Error("secret token failed");
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Internal server error" });
    expect(error).toHaveBeenCalledWith("[api]", expect.objectContaining({ errorCode: "secret_token_failed" }));
    error.mockRestore();
  });
});
