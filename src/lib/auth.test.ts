import { describe, expect, it, vi } from "vitest";
import {
  createCodeChallenge,
  createCodeVerifier,
  createSessionCookieValue,
  createSupabaseOAuthUrl,
  exchangeSupabaseOAuthCode,
  getAuthSession,
  parseSessionCookieValue,
  sessionFromSupabaseTokens,
  signIn,
  signOut,
  signUp
} from "./auth";

describe("auth adapter", () => {
  it("uses local fallback without Supabase env", async () => {
    const session = await signIn({ email: "user@example.com", mode: "email", env: {} });
    expect(session).toEqual({ mode: "email", email: "user@example.com" });
    expect(getAuthSession().email).toBe("user@example.com");
  });

  it("parses Supabase password session when configured", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        access_token: "access",
        refresh_token: "refresh",
        expires_at: 123,
        user: { email: "user@example.com" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const session = await signIn({
      email: "user@example.com",
      password: "secret",
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon"
      }
    });

    expect(session.accessToken).toBe("access");
    expect(fetchMock).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("normalizes Supabase REST URLs before auth requests", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        access_token: "access",
        refresh_token: "refresh",
        user: { email: "user@example.com" }
      })
    );

    await signIn({
      email: "user@example.com",
      password: "secret",
      fetchImpl: fetchMock as typeof fetch,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co/rest/v1",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon"
      }
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://project.supabase.co/auth/v1/token?grant_type=password",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("creates OAuth URL and signs out", () => {
    expect(
      createSupabaseOAuthUrl("google", "https://app.test/auth/callback", {
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co/auth/v1",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon"
      })
    ).toContain("https://project.supabase.co/auth/v1/authorize");
    expect(signOut().mode).toBe("local");
  });

  it("signs up through Supabase Auth when configured", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        access_token: "access",
        refresh_token: "refresh",
        expires_in: 3600,
        user: { email: "new@example.com" }
      })
    );

    const session = await signUp({
      email: "new@example.com",
      password: "secret123",
      fetchImpl: fetchMock as typeof fetch,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon"
      }
    });

    expect(session).toMatchObject({ mode: "email", email: "new@example.com", accessToken: "access" });
    expect(fetchMock).toHaveBeenCalledWith("https://project.supabase.co/auth/v1/signup", expect.objectContaining({ method: "POST" }));
  });

  it("creates PKCE OAuth challenge and exchanges callback code", async () => {
    const verifier = createCodeVerifier();
    await expect(createCodeChallenge(verifier)).resolves.toMatch(/^[A-Za-z0-9_-]+$/);
    const fetchMock = vi.fn(async () =>
      Response.json({
        access_token: "oauth-access",
        refresh_token: "oauth-refresh",
        expires_at: 123,
        user: { email: "google@example.com" }
      })
    );

    const session = await exchangeSupabaseOAuthCode({
      code: "auth-code",
      codeVerifier: verifier,
      redirectTo: "https://app.test/api/auth/callback",
      fetchImpl: fetchMock as typeof fetch,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon"
      }
    });

    expect(session).toMatchObject({ mode: "google", email: "google@example.com", accessToken: "oauth-access" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://project.supabase.co/auth/v1/token?grant_type=pkce",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("serializes production sessions for httpOnly cookies", () => {
    const session = sessionFromSupabaseTokens({ email: "user@example.com", accessToken: "access", refreshToken: "refresh" });
    const cookie = createSessionCookieValue(session);
    expect(parseSessionCookieValue(cookie)).toMatchObject({ email: "user@example.com", accessToken: "access" });
    expect(parseSessionCookieValue("not-json")).toBeUndefined();
  });
});
