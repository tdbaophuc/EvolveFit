import { NextResponse } from "next/server";
import { readJson, updateSupplementReminder } from "@/lib/api";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const [{ id }, body] = await Promise.all([context.params, readJson<{ reminderHour?: number }>(request)]);
  return NextResponse.json(updateSupplementReminder(id, body?.reminderHour ?? -1));
}
