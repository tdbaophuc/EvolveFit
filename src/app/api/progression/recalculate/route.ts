import { NextResponse } from "next/server";
import { readJson, recalculateProgression } from "@/lib/api";

export async function POST(request: Request) {
  const body = await readJson<{ exerciseId?: string }>(request);
  return NextResponse.json(recalculateProgression(body?.exerciseId ?? ""));
}
