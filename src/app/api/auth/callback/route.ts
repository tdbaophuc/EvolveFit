import { NextResponse } from "next/server";
import {
  authCookieName,
  createSessionCookieValue,
  exchangeSupabaseOAuthCode,
  oauthCodeVerifierCookieName,
  oauthStateCookieName,
  sessionFromSupabaseTokens
} from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const accessToken = url.searchParams.get("access_token");
  const refreshToken = url.searchParams.get("refresh_token") ?? undefined;
  const email = url.searchParams.get("email") ?? undefined;
  const expiresAt = Number(url.searchParams.get("expires_at"));
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = (name: string) =>
    cookieHeader
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${name}=`))
      ?.split("=")[1];

  if (code) {
    const verifier = cookie(oauthCodeVerifierCookieName);
    const expectedState = cookie(oauthStateCookieName);
    if (!verifier || !expectedState || expectedState !== state) {
      return NextResponse.json({ ok: false, error: "OAuth state or verifier is invalid" }, { status: 400 });
    }
    try {
      const session = await exchangeSupabaseOAuthCode({
        code,
        codeVerifier: verifier,
        redirectTo: new URL("/api/auth/callback", request.url).toString()
      });
      const response = NextResponse.redirect(new URL("/", request.url));
      response.cookies.set(authCookieName, createSessionCookieValue(session), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: session.expiresAt ? Math.max(0, session.expiresAt - Math.floor(Date.now() / 1000)) : 60 * 60 * 24 * 30
      });
      response.cookies.delete(oauthCodeVerifierCookieName);
      response.cookies.delete(oauthStateCookieName);
      return response;
    } catch (error) {
      return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "OAuth callback failed" }, { status: 400 });
    }
  }

  if (!accessToken) {
    return NextResponse.json(
      {
        ok: false,
        error: "access_token or code is required"
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
