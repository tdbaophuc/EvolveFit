import { NextResponse } from "next/server";
import { deleteExercise, readJson, updateExercise } from "@/lib/api";
import type { ExerciseDefinition } from "@evolvefit/shared";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await readJson<Partial<ExerciseDefinition>>(request);
  if (!body) return NextResponse.json({ ok: false, error: "body is required" }, { status: 400 });
  const result = updateExercise(id, body);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = deleteExercise(id);
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
