import { NextResponse } from "next/server";
import { authCookieName, signOut } from "@/lib/auth";

export function POST() {
  const response = NextResponse.json({ ok: true, data: signOut() });
  response.cookies.delete(authCookieName);
  return response;
}
