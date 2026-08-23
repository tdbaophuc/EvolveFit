import { NextResponse } from "next/server";
import { finishWorkoutSessionById } from "@/lib/api";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = finishWorkoutSessionById(id);
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
