import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp, csrfHeaderName } from "../app";
import { createSessionCookieValue, parseSessionCookieValue } from "../lib/auth";
import { ConfigError } from "../lib/config";
import { recordClientError } from "../lib/observability";
import { validatePushEndpoint } from "../lib/push";
import { validateSyncPayload } from "../lib/sync-validation";
import { createTestClient } from "../test-client";

const supabaseEnv = {
  API_DATA_MODE: "supabase",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SESSION_SECRET: "test-session-secret-at-least-32-characters-long",
  API_CORS_ORIGIN: "https://app.example.com",
  APP_BASE_URL: "https://app.example.com"
};

const productionEnv = {
  ...supabaseEnv,
  NODE_ENV: "production",
  SUPABASE_SERVICE_ROLE_KEY: "service-role"
};

describe("API security hardening", () => {
  const apps: FastifyInstance[] = [];
  async function start(env: NodeJS.ProcessEnv) {
    const app = await buildApp(env);
    await app.ready();
    apps.push(app);
    return app;
  }

  afterEach(async () => {
    vi.unstubAllGlobals();
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it("refuses to start production without Supabase, a session secret, CORS allowlist, or app URL", async () => {
    await expect(buildApp({ NODE_ENV: "production" })).rejects.toBeInstanceOf(ConfigError);
    await expect(buildApp({ ...productionEnv, API_DATA_MODE: "memory" })).rejects.toThrow(/API_DATA_MODE/);
    await expect(buildApp({ ...productionEnv, SESSION_SECRET: "short" })).rejects.toThrow(/SESSION_SECRET/);
    await expect(buildApp({ ...productionEnv, API_CORS_ORIGIN: "" })).rejects.toThrow(/API_CORS_ORIGIN/);
    await expect(buildApp({ ...productionEnv, APP_BASE_URL: "http://app.example.com" })).rejects.toThrow(/https/);
    await expect(buildApp({ ...productionEnv, APP_ENV: "staging", NODE_ENV: "development", API_DATA_MODE: "memory" })).rejects.toThrow(/API_DATA_MODE/);
    const app = await start(productionEnv);
    const health = (await app.inject("/api/health")).json();
    expect(health.data.integrations).toBeUndefined();
    expect((await app.inject("/api/health")).headers["strict-transport-security"]).toContain("max-age");
    expect((await app.inject("/api/docs/openapi")).statusCode).toBe(404);
  });

  it("seals session cookies so they cannot be read, forged, or tampered with", () => {
    const env = { SESSION_SECRET: supabaseEnv.SESSION_SECRET };
    const sealed = createSessionCookieValue({ mode: "email", email: "a@example.com", accessToken: "jwt-a" }, env);
    expect(sealed).not.toContain("a@example.com");
    expect(Buffer.from(sealed, "base64url").toString("utf8")).not.toContain("jwt-a");
    expect(parseSessionCookieValue(sealed, env)).toMatchObject({ email: "a@example.com", accessToken: "jwt-a" });

    const forged = Buffer.from(JSON.stringify({ mode: "local", email: "admin@example.com" })).toString("base64url");
    expect(parseSessionCookieValue(forged, env)).toBeUndefined();
    const tampered = `${sealed.slice(0, -3)}${sealed.endsWith("A") ? "B" : "A"}AA`;
    expect(parseSessionCookieValue(tampered, env)).toBeUndefined();
    expect(parseSessionCookieValue(sealed, { SESSION_SECRET: "another-secret-that-is-at-least-32-chars" })).toBeUndefined();
    expect(parseSessionCookieValue(sealed, { SESSION_SECRET: "rotated-secret-that-is-at-least-32-chars", SESSION_SECRET_PREVIOUS: env.SESSION_SECRET })).toMatchObject({
      email: "a@example.com"
    });
    const expired = createSessionCookieValue({ mode: "email", email: "a@example.com" }, env, 60, Date.now() - 120_000);
    expect(parseSessionCookieValue(expired, env)).toBeUndefined();
  });

  it("does not grant admin to a forged unsigned cookie in memory mode", async () => {
    const app = await start({ ADMIN_BOOTSTRAP_EMAILS: "admin@example.com" });
    const forged = Buffer.from(JSON.stringify({ mode: "local", email: "admin@example.com" })).toString("base64url");
    const response = await app.inject({ url: "/api/admin/dashboard", headers: { cookie: `evolvefit_session=${forged}` } });
    expect(response.statusCode).toBe(401);
  });

  it("never leaks another user's session or tokens from /api/auth/session", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/v1/token")) {
        return Response.json({ access_token: "jwt-victim", refresh_token: "refresh-victim", expires_in: 3600, user: { email: "victim@example.com", email_confirmed_at: "x" } });
      }
      if (url.includes("/auth/v1/user")) return Response.json({ id: "victim", email: "victim@example.com" });
      return new Response("[]", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const app = await start(supabaseEnv);
    const victim = createTestClient(app);
    const signIn = await victim({ method: "POST", url: "/api/auth/sign-in", payload: { email: "victim@example.com", password: "password123" } });
    expect(signIn.statusCode).toBe(200);
    expect(signIn.json().data.accessToken).toBeUndefined();
    expect(signIn.json().data.refreshToken).toBeUndefined();
    const sessionCookie = signIn.cookies.find((cookie) => cookie.name === "evolvefit_session");
    expect(sessionCookie).toMatchObject({ httpOnly: true, sameSite: "Lax" });

    const attacker = await app.inject("/api/auth/session");
    expect(attacker.json().data).toMatchObject({ mode: "local", authenticated: false });
    expect(JSON.stringify(attacker.json())).not.toContain("victim");
    expect((await app.inject("/api/hydration/today")).statusCode).toBe(401);
  });

  it("requires a password for Supabase sign-in and hides upstream errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{\"msg\":\"internal detail\"}", { status: 400 })));
    const app = await start(supabaseEnv);
    const call = createTestClient(app);
    const noPassword = await call({ method: "POST", url: "/api/auth/sign-in", payload: { email: "a@example.com", mode: "local" } });
    expect(noPassword.statusCode).toBe(401);
    const wrong = await call({ method: "POST", url: "/api/auth/sign-in", payload: { email: "a@example.com", password: "wrong-password" } });
    expect(wrong.json()).toMatchObject({ ok: false, error: "Invalid email or password" });
    expect(wrong.body).not.toContain("internal detail");
  });

  it("only accepts auth redirects to trusted origins", async () => {
    const fetchMock = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);
    const app = await start(supabaseEnv);
    const call = createTestClient(app);
    const evil = await call({ method: "POST", url: "/api/auth/password/forgot", payload: { email: "a@example.com", redirectTo: "https://evil.example/steal" } });
    expect(evil.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();

    const spoofedHost = await call({ method: "POST", url: "/api/auth/password/forgot", headers: { host: "evil.example", "x-forwarded-host": "evil.example" }, payload: { email: "a@example.com" } });
    expect(spoofedHost.statusCode).toBe(200);
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown[] as [string, RequestInit])[1].body));
    expect(body.redirect_to).toBe("https://app.example.com/");

    const allowed = await call({ method: "POST", url: "/api/auth/password/forgot", payload: { email: "a@example.com", redirectTo: "https://app.example.com/reset" } });
    expect(allowed.statusCode).toBe(200);
  });

  it("rejects OAuth implicit-flow tokens that Supabase does not verify", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("unauthorized", { status: 401 })));
    const app = await start(supabaseEnv);
    const response = await app.inject("/api/auth/callback?access_token=attacker-token&email=victim@example.com");
    expect(response.statusCode).toBe(400);
    expect(response.cookies.find((cookie) => cookie.name === "evolvefit_session")).toBeUndefined();
  });

  it("blocks cross-site and header-less state-changing requests (CSRF)", async () => {
    const app = await start({ API_CORS_ORIGIN: "https://app.example.com" });
    const noHeader = await app.inject({ method: "POST", url: "/api/hydration/log", payload: { amountMl: 250 } });
    expect(noHeader.statusCode).toBe(403);
    expect(noHeader.json()).toMatchObject({ details: { reason: "missing-csrf-header" } });

    const evilOrigin = await app.inject({
      method: "POST",
      url: "/api/hydration/log",
      headers: { origin: "https://evil.example", [csrfHeaderName]: "web" },
      payload: { amountMl: 250 }
    });
    expect(evilOrigin.statusCode).toBe(403);
    expect(evilOrigin.json()).toMatchObject({ details: { reason: "untrusted-origin" } });

    const trusted = await app.inject({
      method: "POST",
      url: "/api/hydration/log",
      headers: { origin: "https://app.example.com", [csrfHeaderName]: "web" },
      payload: { amountMl: 250 }
    });
    expect(trusted.statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/api/hydration/today" })).statusCode).toBe(200);
  });

  it("never reflects untrusted CORS origins, even without API_CORS_ORIGIN in development", async () => {
    const app = await start({});
    const evil = await app.inject({ method: "OPTIONS", url: "/api/health", headers: { origin: "https://evil.example", "access-control-request-method": "POST" } });
    expect(evil.headers["access-control-allow-origin"]).toBeUndefined();
    const local = await app.inject({ method: "OPTIONS", url: "/api/health", headers: { origin: "http://localhost:3000", "access-control-request-method": "POST" } });
    expect(local.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });

  it("rejects push endpoints outside known push services (SSRF)", async () => {
    expect(validatePushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBeUndefined();
    expect(validatePushEndpoint("https://web.push.apple.com/abc")).toBeUndefined();
    expect(validatePushEndpoint("http://fcm.googleapis.com/fcm/send/abc")).toMatch(/https/);
    expect(validatePushEndpoint("https://169.254.169.254/latest/meta-data")).toMatch(/not a supported/);
    expect(validatePushEndpoint("https://fcm.googleapis.com.evil.example/x")).toMatch(/not a supported/);
    expect(validatePushEndpoint("https://user:pass@fcm.googleapis.com/x")).toMatch(/credentials/);
    expect(validatePushEndpoint("https://fcm.googleapis.com:8443/x")).toMatch(/port/);

    const app = await start({});
    const call = createTestClient(app);
    const response = await call({
      method: "POST",
      url: "/api/notifications/subscribe",
      payload: { endpoint: "https://internal.service.local/admin", keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) } }
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ ok: false, error: "endpoint is not a supported push service" });
  });

  it("validates sync batch payloads per type and strips unknown or identity fields", async () => {
    expect(validateSyncPayload("hydration.log", { id: "h1", amountMl: "lots" })).toMatchObject({ ok: false });
    expect(validateSyncPayload("hydration.log", { id: "h1", amountMl: 250, isAdmin: true })).toEqual({ ok: true, payload: { id: "h1", amountMl: 250 } });
    expect(validateSyncPayload("profile.update", { name: "Phuc", email: "admin@example.com", authMode: "google" })).toEqual({ ok: true, payload: { name: "Phuc" } });
    expect(validateSyncPayload("workout.set.create", { id: "s1", exerciseId: "e", exerciseName: "Press", targetWeightKg: 1e9, targetReps: 5, actualWeightKg: 1, actualReps: 1 })).toMatchObject({ ok: false });
    expect(validateSyncPayload("routine.create", { name: "R", days: [{ id: "d", exercises: [{ id: "x", name: "y", targetSets: "many" }] }] })).toMatchObject({ ok: false });
    expect(validateSyncPayload("bodyMetric.upsert", { id: "b", measuredAt: "2026-01-01", weightKg: 80, heightCm: 180, note: "x".repeat(70 * 1024) })).toMatchObject({
      ok: false
    });

    const app = await start({});
    const call = createTestClient(app);
    const badEnvelope = await call({ method: "POST", url: "/api/sync/batch", payload: { items: [{ type: "hydration.log", payload: "nope" }] } });
    expect(badEnvelope.statusCode).toBe(400);
    const result = (await call({
      method: "POST",
      url: "/api/sync/batch",
      payload: {
        items: [
          { id: "bad", type: "hydration.log", payload: { id: "h-bad", amountMl: -5 } },
          { id: "profile", type: "profile.update", payload: { name: "Synced", email: "admin@example.com" } }
        ]
      }
    })).json();
    expect(result.data.results).toMatchObject([{ status: "failed" }, { status: "synced", data: { name: "Synced" } }]);
    expect(result.data.results[1].data.email).not.toBe("admin@example.com");
  });

  it("redacts secrets and personal data from client error reports", () => {
    const report = recordClientError({
      message: "Failed for phuc@example.com with Bearer abc.def.ghi",
      stack: "Error at https://app/x?access_token=secret123\n at eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.sig",
      path: "/reset?token=abc",
      requestId: "bad id with spaces\nInjected"
    });
    expect(report.message).not.toContain("phuc@example.com");
    expect(report.message).not.toContain("abc.def.ghi");
    expect(report.stack).not.toContain("secret123");
    expect(report.stack).not.toContain("eyJzdWIiOiIxMjM0NTYifQ");
    expect(report.path).toBe("/reset");
    expect(report.requestId).toMatch(/^req_/);
  });

  it("sends defensive security headers and sanitises request ids", async () => {
    const app = await start({});
    const response = await app.inject({ url: "/api/health", headers: { "x-request-id": "evil\r\ninjected" } });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["x-request-id"]).toMatch(/^req_/);
  });
});
