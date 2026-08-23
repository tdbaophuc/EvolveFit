import { NextResponse } from "next/server";
import { createExercise, listExercises, readJson } from "@/lib/api";
import type { ExerciseDefinition } from "@/lib/core";

export function GET() {
  return NextResponse.json(listExercises());
}

export async function POST(request: Request) {
  const body = await readJson<Partial<ExerciseDefinition>>(request);
  if (!body) return NextResponse.json({ ok: false, error: "body is required" }, { status: 400 });
  const result = createExercise(body);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
