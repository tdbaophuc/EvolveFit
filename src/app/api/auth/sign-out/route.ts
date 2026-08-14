import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth";

export function POST() {
  return NextResponse.json({ ok: true, data: signOut() });
}
