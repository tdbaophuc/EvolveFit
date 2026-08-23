import { NextResponse } from "next/server";
import { readJson } from "@/lib/api";
import { authCookieName, createSessionCookieValue, signUp } from "@/lib/auth";
import { requestIdFromHeaders, requestIdResponseHeader } from "@/lib/observability";

export async function POST(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  const body = await readJson<{ email?: string; password?: string }>(request);
  if (!body?.email || !body.password) {
    return NextResponse.json(
      { ok: false, error: "email and password are required", requestId },
      { status: 400, headers: { [requestIdResponseHeader()]: requestId } }
    );
  }

  try {
    const session = await signUp({ email: body.email, password: body.password });
    const response = NextResponse.json({ ok: true, data: session, requestId }, { headers: { [requestIdResponseHeader()]: requestId } });
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
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Sign-up failed", requestId },
      { status: 400, headers: { [requestIdResponseHeader()]: requestId } }
    );
  }
}
