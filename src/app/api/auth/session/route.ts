import { NextResponse } from "next/server";
import { authCookieName, getAuthSession, parseSessionCookieValue } from "@/lib/auth";

export function GET(request: Request) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${authCookieName}=`))
    ?.split("=")[1];
  return NextResponse.json({ ok: true, data: parseSessionCookieValue(cookie) ?? getAuthSession() });
}
