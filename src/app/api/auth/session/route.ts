import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

export function GET() {
  return NextResponse.json({ ok: true, data: getAuthSession() });
}
