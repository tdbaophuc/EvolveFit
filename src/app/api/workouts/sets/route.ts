import { NextResponse } from "next/server";
import { logWorkoutSet, readJson } from "@/lib/api";
import type { WorkoutSet } from "@/lib/core";

export async function POST(request: Request) {
  const body = await readJson<Omit<WorkoutSet, "id" | "completedAt">>(request);
  if (!body) return NextResponse.json({ ok: false, error: "body is required" }, { status: 400 });
  return NextResponse.json(logWorkoutSet(body));
}
