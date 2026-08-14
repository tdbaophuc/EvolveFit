import { describe, expect, it, vi } from "vitest";
import { createSupabaseOAuthUrl, getAuthSession, signIn, signOut } from "./auth";

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

  it("creates OAuth URL and signs out", () => {
    expect(
      createSupabaseOAuthUrl("google", "https://app.test/auth/callback", {
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon"
      })
    ).toContain("provider=google");
    expect(signOut().mode).toBe("local");
  });
});
