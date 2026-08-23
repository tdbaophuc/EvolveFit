import { NextResponse } from "next/server";
import {
  createCodeChallenge,
  createCodeVerifier,
  createOauthState,
  createSupabaseOAuthUrl,
  oauthCodeVerifierCookieName,
  oauthStateCookieName
} from "@/lib/auth";

export async function GET(request: Request) {
  const redirectTo = new URL("/api/auth/callback", request.url).toString();
  const verifier = createCodeVerifier();
  const challenge = await createCodeChallenge(verifier);
  const state = createOauthState();
  const oauthUrl = createSupabaseOAuthUrl("google", redirectTo, process.env, { codeChallenge: challenge, state });

  if (!oauthUrl) {
    return NextResponse.json({ ok: false, error: "Supabase OAuth env is missing" }, { status: 503 });
  }

  const response = NextResponse.redirect(oauthUrl);
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10
  };
  response.cookies.set(oauthCodeVerifierCookieName, verifier, cookieOptions);
  response.cookies.set(oauthStateCookieName, state, cookieOptions);
  return response;
}
