import { NextResponse } from "next/server";
import { deleteWorkoutSet, readJson, updateWorkoutSet } from "@/lib/api";
import type { WorkoutSet } from "@/lib/core";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await readJson<Partial<WorkoutSet>>(request);
  if (!body) return NextResponse.json({ ok: false, error: "body is required" }, { status: 400 });
  const result = updateWorkoutSet(id, body);
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = deleteWorkoutSet(id);
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
