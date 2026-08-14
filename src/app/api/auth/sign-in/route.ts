import { NextResponse } from "next/server";
import { readJson } from "@/lib/api";
import { authCookieName, createSessionCookieValue, signIn, type AuthMode } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await readJson<{ email?: string; password?: string; mode?: AuthMode }>(request);
  const session = await signIn({
    email: body?.email ?? "local@evolvefit.app",
    password: body?.password,
    mode: body?.mode
  });
  const response = NextResponse.json({ ok: true, data: session });
  if (session.accessToken) {
    response.cookies.set(authCookieName, createSessionCookieValue(session), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: session.expiresAt ? Math.max(0, session.expiresAt - Math.floor(Date.now() / 1000)) : 60 * 60 * 24 * 30
    });
  }
  return response;
}
