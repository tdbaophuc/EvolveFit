import { NextResponse } from "next/server";
import { resumeWorkoutSessionById } from "@/lib/api";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = resumeWorkoutSessionById(id);
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
