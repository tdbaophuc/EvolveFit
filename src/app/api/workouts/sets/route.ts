import { NextResponse } from "next/server";
import { createWorkoutSet, readJson } from "@/lib/api";
import type { WorkoutSet } from "@/lib/core";

export async function POST(request: Request) {
  const body = await readJson<WorkoutSet | Omit<WorkoutSet, "id" | "completedAt">>(request);
  if (!body) return NextResponse.json({ ok: false, error: "body is required" }, { status: 400 });
  const result = createWorkoutSet(body);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
