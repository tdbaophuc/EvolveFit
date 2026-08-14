import { NextResponse } from "next/server";
import { readJson, updateSupplement, updateSupplementReminder } from "@/lib/api";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const [{ id }, body] = await Promise.all([context.params, readJson<{ reminderHour?: number }>(request)]);
  return NextResponse.json(updateSupplementReminder(id, body?.reminderHour ?? -1));
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const [{ id }, body] = await Promise.all([
    context.params,
    readJson<{ name?: string; defaultAmount?: number; reminderHour?: number; scheduleHours?: number[]; active?: boolean }>(request)
  ]);
  return NextResponse.json(updateSupplement(id, body ?? {}));
}
