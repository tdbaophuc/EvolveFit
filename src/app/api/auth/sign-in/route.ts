import { NextResponse } from "next/server";
import { readJson } from "@/lib/api";
import { signIn, type AuthMode } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await readJson<{ email?: string; password?: string; mode?: AuthMode }>(request);
  const session = await signIn({
    email: body?.email ?? "local@evolvefit.app",
    password: body?.password,
    mode: body?.mode
  });
  return NextResponse.json({ ok: true, data: session });
}
