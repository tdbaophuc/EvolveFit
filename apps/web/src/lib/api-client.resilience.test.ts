import { afterEach, describe, expect, it, vi } from "vitest";
import { EvolveFitApiClient } from "./api-client";
import { apiErrorMessage, passwordProblem } from "./api-errors";

const fastClient = () => new EvolveFitApiClient("https://api.test", { coldStartTimeoutMs: 50, timeoutMs: 50, retryDelayMs: 1 });

describe("EvolveFitApiClient resilience", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("never throws on network failures and reports a network_error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    await expect(fastClient().signIn({ email: "a@b.co", password: "secret123", mode: "email" })).resolves.toMatchObject({ ok: false, errorCode: "network_error" });
  });

  it("times out hanging requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))))
    );
    await expect(fastClient().signIn({ email: "a@b.co", password: "x", mode: "email" })).resolves.toMatchObject({ ok: false, errorCode: "timeout" });
  });

  it("retries idempotent GETs once when the backend is waking up (HTML 502)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("<html>Bad gateway</html>", { status: 502 }))
      .mockResolvedValueOnce(Response.json({ ok: true, data: { mode: "local", email: "x", authenticated: false } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fastClient().session()).resolves.toMatchObject({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-idempotent requests", async () => {
    const fetchMock = vi.fn(async () => new Response("<html>Bad gateway</html>", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fastClient().signUp({ email: "a@b.co", password: "secret123" })).resolves.toMatchObject({ ok: false, errorCode: "bad_response", status: 502 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps API error envelopes and their status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: false, error: "Invalid email or password", errorCode: "invalid_email_or_password" }, { status: 401 })));
    await expect(fastClient().signIn({ email: "a@b.co", password: "x", mode: "email" })).resolves.toEqual({
      ok: false,
      error: "Invalid email or password",
      errorCode: "invalid_email_or_password",
      status: 401
    });
  });
});

describe("apiErrorMessage", () => {
  it("translates API and client error codes into Vietnamese", () => {
    expect(apiErrorMessage({ error: "x", errorCode: "invalid_email_or_password" })).toBe("Email hoặc mật khẩu không đúng.");
    expect(apiErrorMessage({ error: "x", errorCode: "network_error" })).toMatch(/Không kết nối được máy chủ/);
    expect(apiErrorMessage({ error: "Forbidden", errorCode: "forbidden", details: { reason: "untrusted-origin" } })).toMatch(/chưa được phép/);
    expect(apiErrorMessage({ error: "x", errorCode: "validation_failed", details: [{ field: "body.password", message: "must be at least 8 characters" }] })).toBe(
      "Mật khẩu không hợp lệ: cần ít nhất 8 ký tự."
    );
    expect(apiErrorMessage({ error: "boom", status: 500 })).toMatch(/Máy chủ gặp lỗi/);
    expect(apiErrorMessage(undefined, "fallback")).toBe("fallback");
  });

  it("mirrors backend password rules", () => {
    expect(passwordProblem("short", "sign-up")).toMatch(/8 ký tự/);
    expect(passwordProblem("short", "sign-in")).toBeUndefined();
    expect(passwordProblem("", "sign-in")).toMatch(/nhập mật khẩu/);
  });
});
