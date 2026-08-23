import { NextResponse } from "next/server";
import { readJson } from "@/lib/api";
import { authCookieName, createSessionCookieValue, signUp } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await readJson<{ email?: string; password?: string }>(request);
  if (!body?.email || !body.password) {
    return NextResponse.json({ ok: false, error: "email and password are required" }, { status: 400 });
  }

  try {
    const session = await signUp({ email: body.email, password: body.password });
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
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Sign-up failed" }, { status: 400 });
  }
}
