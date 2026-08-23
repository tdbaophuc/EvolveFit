import { NextResponse } from "next/server";
import { readJson, reorderWorkoutSession } from "@/lib/api";
import type { SessionExerciseQueueItem } from "@/lib/core";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await readJson<{ queue?: SessionExerciseQueueItem[] }>(request);
  if (!body?.queue) return NextResponse.json({ ok: false, error: "queue is required" }, { status: 400 });
  const result = reorderWorkoutSession(id, body.queue);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
