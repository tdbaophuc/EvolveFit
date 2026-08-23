import { NextResponse } from "next/server";
import { readJson } from "@/lib/api";
import { authCookieName, createSessionCookieValue, signIn, type AuthMode } from "@/lib/auth";
import { requestIdFromHeaders, requestIdResponseHeader } from "@/lib/observability";

export async function POST(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  const body = await readJson<{ email?: string; password?: string; mode?: AuthMode }>(request);
  try {
    const session = await signIn({
      email: body?.email ?? "local@evolvefit.app",
      password: body?.password,
      mode: body?.mode
    });
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
      { ok: false, error: error instanceof Error ? error.message : "Sign-in failed", requestId },
      { status: 401, headers: { [requestIdResponseHeader()]: requestId } }
    );
  }
}
