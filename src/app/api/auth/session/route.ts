import { NextResponse } from "next/server";
import { authCookieName, getAuthSession, parseSessionCookieValue } from "@/lib/auth";
import { requestIdFromHeaders, requestIdResponseHeader } from "@/lib/observability";

export function GET(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${authCookieName}=`))
    ?.split("=")[1];
  return NextResponse.json(
    { ok: true, data: parseSessionCookieValue(cookie) ?? getAuthSession(), requestId },
    { headers: { [requestIdResponseHeader()]: requestId } }
  );
}
