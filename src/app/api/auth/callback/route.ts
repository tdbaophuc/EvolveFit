import { NextResponse } from "next/server";
import { authCookieName, createSessionCookieValue, sessionFromSupabaseTokens } from "@/lib/auth";

export function GET(request: Request) {
  const url = new URL(request.url);
  const accessToken = url.searchParams.get("access_token");
  const refreshToken = url.searchParams.get("refresh_token") ?? undefined;
  const email = url.searchParams.get("email") ?? undefined;
  const expiresAt = Number(url.searchParams.get("expires_at"));

  if (!accessToken) {
    return NextResponse.json(
      {
        ok: false,
        error: url.searchParams.has("code")
          ? "OAuth code callback received; configure PKCE verifier exchange on the client before redirecting here."
          : "access_token is required"
      },
      { status: 400 }
    );
  }

  const session = sessionFromSupabaseTokens({
    accessToken,
    refreshToken,
    email,
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : undefined,
    mode: "google"
  });
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(authCookieName, createSessionCookieValue(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: session.expiresAt ? Math.max(0, session.expiresAt - Math.floor(Date.now() / 1000)) : 60 * 60 * 24 * 30
  });
  return response;
}
