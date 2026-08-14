import { NextResponse } from "next/server";
import { hydrationReminderEvents } from "@/lib/api";

export function POST() {
  return NextResponse.json(hydrationReminderEvents());
}
