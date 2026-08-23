import { NextResponse } from "next/server";
import { readJson, startWorkoutSession } from "@/lib/api";

export async function POST(request: Request) {
  const body = await readJson<{
    routineId?: string;
    workoutDayId?: string;
    sessionName?: string;
    sessionExerciseOrder?: string[];
  }>(request);
  if (!body) return NextResponse.json({ ok: false, error: "body is required" }, { status: 400 });
  const result = startWorkoutSession(body);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
