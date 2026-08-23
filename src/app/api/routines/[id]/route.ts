import { NextResponse } from "next/server";
import { deleteRoutine, readJson, updateRoutine } from "@/lib/api";
import type { Routine } from "@/lib/core";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await readJson<Partial<Routine> & { baseUpdatedAt?: string; conflictResolution?: "confirm" }>(request);
  if (!body) return NextResponse.json({ ok: false, error: "body is required" }, { status: 400 });
  const result = updateRoutine(id, body);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = deleteRoutine(id);
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
