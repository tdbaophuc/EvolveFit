import { NextResponse } from "next/server";
import { createRoutine, listRoutines, readJson } from "@/lib/api";
import type { Routine } from "@/lib/core";

export function GET() {
  return NextResponse.json(listRoutines());
}

export async function POST(request: Request) {
  const body = await readJson<Partial<Routine>>(request);
  if (!body) return NextResponse.json({ ok: false, error: "body is required" }, { status: 400 });
  const result = createRoutine(body);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
